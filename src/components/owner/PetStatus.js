import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Modal, Form, Table } from 'react-bootstrap';
import { petAPI, ownerAPI, microchipAPI, vetCardAPI, handleAPIError } from '../../services/api';

const WaveDots = ({ color = '#000000' }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '1rem' }}>
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0s' }} />
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0.15s' }} />
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0.3s' }} />
  </span>
);

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
  
  const [originalEditData, setOriginalEditData] = useState({});

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
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'trash'
  const [trashedPets, setTrashedPets] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);
  const [trashPage, setTrashPage] = useState(1);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
const [showForceDeleteModal, setShowForceDeleteModal] = useState(false);
const [restoreLoading, setRestoreLoading] = useState(false);
const [forceDeleteLoading, setForceDeleteLoading] = useState(false);
const [archivedPets, setArchivedPets] = useState([]);
const [archiveLoading, setArchiveLoading] = useState(false);
const [archivePage, setArchivePage] = useState(1);
const [showArchiveModal, setShowArchiveModal] = useState(false);
const [showUnarchiveModal, setShowUnarchiveModal] = useState(false);
const [archiveActionLoading, setArchiveActionLoading] = useState(false);
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

    const getDaysUntilPermanentDelete = (deletedAt) => {
    if (!deletedAt) return null;
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
    const now = new Date();
    const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const loadArchived = async () => {
    try {
      setArchiveLoading(true);
      const res = await petAPI.archived();
      setArchivedPets(res.data.pets || []);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleArchivePet = (pet) => {
    setSelectedPet(pet);
    setShowArchiveModal(true);
  };

  const confirmArchivePet = async () => {
    setArchiveActionLoading(true);
    setShowArchiveModal(false);
    try {
      await petAPI.archive(selectedPet.id);
      await loadPets();
      await loadArchived();
      setUpdateSuccess(`${selectedPet.name} has been archived.`);
      setTimeout(() => setUpdateSuccess(''), 3000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setArchiveActionLoading(false);
    }
  };

  const handleUnarchivePet = (pet) => {
    setSelectedPet(pet);
    setShowUnarchiveModal(true);
  };

  const confirmUnarchivePet = async () => {
    setArchiveActionLoading(true);
    setShowUnarchiveModal(false);
    try {
      await petAPI.unarchive(selectedPet.id);
      await loadPets();
      await loadArchived();
      setUpdateSuccess(`${selectedPet.name} has been restored to active.`);
      setTimeout(() => setUpdateSuccess(''), 3000);
      setActiveTab('active');
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setArchiveActionLoading(false);
    }
  };

  const loadTrash = async () => {
    try {
      setTrashLoading(true);
      const res = await petAPI.trash();
      setTrashedPets(res.data.pets || []);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setTrashLoading(false);
    }
  };

  const handleRestorePet = (pet) => {
    setSelectedPet(pet);
    setShowRestoreModal(true);
  };

  const confirmRestorePet = async () => {
    setRestoreLoading(true);
    setShowRestoreModal(false);
    try {
      await petAPI.restore(selectedPet.id);
      await loadPets();
      await loadTrash();
      setUpdateSuccess(`${selectedPet.name} has been restored successfully.`);
      setTimeout(() => setUpdateSuccess(''), 3000);
      setActiveTab('active');
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setRestoreLoading(false);
    }
  };

  const handleForceDeletePet = (pet) => {
    setSelectedPet(pet);
    setShowForceDeleteModal(true);
  };

  const confirmForceDeletePet = async () => {
    setForceDeleteLoading(true);
    setShowForceDeleteModal(false);
    try {
      await petAPI.forceDelete(selectedPet.id);
      await loadTrash();
      setUpdateSuccess(`${selectedPet.name} has been permanently deleted.`);
      setTimeout(() => setUpdateSuccess(''), 3000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setForceDeleteLoading(false);
    }
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
    loadTrash();
    loadArchived();
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

    /* ---------------- My Pets ---------------- */
    @keyframes ptIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ptMenu { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes ptShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
    @keyframes ptToast { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
    .pt-anim { animation: ptIn 0.45s ease-out backwards; animation-delay: var(--d, 0s); }

    .pt-title { font-weight: 700; color: #1f2328; font-size: 1.85rem; margin: 0; }
    .pt-sub { color: #6b7280; font-size: 0.95rem; margin: 0.15rem 0 0; }

    .pt-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; border-radius: 10px; border: 1px solid transparent; font-weight: 600; font-size: 0.85rem; padding: 0.5rem 0.95rem; white-space: nowrap; transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
    .pt-btn.lg { padding: 0.7rem 1.25rem; font-size: 0.92rem; }
    .pt-btn.sm { padding: 0.42rem 0.8rem; font-size: 0.8rem; }
    .pt-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .pt-btn.primary { background: #ffc107; color: #1f2328; }
    .pt-btn.primary:hover:not(:disabled) { background: #f0b400; box-shadow: 0 6px 16px rgba(255,193,7,0.35); transform: translateY(-1px); }
    .pt-btn.ghost { background: #fff; color: #1f2328; border-color: #e5e7eb; }
    .pt-btn.ghost:hover:not(:disabled) { background: #fff8e1; border-color: #ffc107; }
    .pt-btn.amber { background: rgba(255,193,7,0.16); color: #8a6700; }
    .pt-btn.amber:hover:not(:disabled) { background: rgba(255,193,7,0.28); }
    .pt-btn.success { background: #198754; color: #fff; }
    .pt-btn.success:hover:not(:disabled) { background: #157347; }
    .pt-btn.danger-outline { background: #fff; color: #dc3545; border-color: rgba(220,53,69,0.35); }
    .pt-btn.danger-outline:hover:not(:disabled) { background: rgba(220,53,69,0.06); }

    .pt-tabs { display: inline-flex; gap: 0.25rem; padding: 4px; border-radius: 12px; background: #f3f4f6; align-self: flex-start; max-width: 100%; overflow-x: auto; }
    .pt-tab { display: inline-flex; align-items: center; gap: 0.5rem; border: none; background: transparent; padding: 0.5rem 0.95rem; border-radius: 9px; font-size: 0.86rem; font-weight: 600; color: #5b6270; white-space: nowrap; transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
    .pt-tab i { font-size: 0.8rem; }
    .pt-tab .count { font-size: 0.72rem; padding: 0.05rem 0.45rem; border-radius: 999px; background: rgba(0,0,0,0.06); color: #6b7280; }
    .pt-tab:hover { color: #1f2328; }
    .pt-tab.on { background: #fff; color: #1f2328; box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
    .pt-tab.active.on i { color: #e0a800; }
    .pt-tab.archived.on i { color: #b88a00; }
    .pt-tab.trash.on i { color: #dc3545; }
    .pt-tab.on .count { background: #1f2328; color: #fff; }

    .pt-toast { position: fixed; top: 84px; left: 50%; transform: translateX(-50%); z-index: 99999; min-width: 320px; max-width: 480px; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: #fff; border: 1px solid #e9ecef; border-left: 4px solid #198754; border-radius: 12px; box-shadow: 0 16px 40px rgba(16,24,40,0.16); animation: ptToast 0.35s ease-out; }
    .pt-toast .ic { width: 34px; height: 34px; border-radius: 50%; background: rgba(25,135,84,0.12); color: #198754; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .pt-toast .t { font-weight: 700; color: #1f2328; font-size: 0.92rem; }
    .pt-toast .d { color: #6b7280; font-size: 0.84rem; }
    .pt-toast-close { border: none; background: transparent; color: #9ca3af; width: 28px; height: 28px; border-radius: 7px; }
    .pt-toast-close:hover { background: #f3f4f6; color: #1f2328; }

    .pt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 1.1rem; }
    .pt-card { position: relative; display: flex; flex-direction: column; background: #fff; border: 1px solid #e9ecef; border-radius: 16px; padding: 1.15rem; transition: box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease; }
    .pt-card:hover { box-shadow: 0 12px 28px rgba(16,24,40,0.08); transform: translateY(-3px); border-color: #e2e5ea; }
    .pt-card.raised { z-index: 5; }
    .pt-card.muted { background: #fcfcfd; }
    .pt-card.muted:hover { transform: none; }

    .pt-top { display: flex; align-items: center; gap: 0.9rem; margin-bottom: 0.85rem; }
    .pt-photo { position: relative; width: 64px; height: 64px; border-radius: 14px; overflow: hidden; flex-shrink: 0; background: #f6f7f9; border: 1px solid #eef0f3; cursor: pointer; }
    .pt-photo.static { cursor: default; }
    .pt-photo img { width: 100%; height: 100%; object-fit: cover; }
    .pt-photo-hover { position: absolute; inset: 0; background: rgba(0,0,0,0.4); color: #fff; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s ease; }
    .pt-photo:hover .pt-photo-hover, .pt-photo:focus-visible .pt-photo-hover { opacity: 1; }
    .pt-photo-cam { position: absolute; right: 4px; bottom: 4px; width: 20px; height: 20px; border-radius: 50%; background: #ffc107; color: #1f2328; display: flex; align-items: center; justify-content: center; font-size: 0.55rem; box-shadow: 0 1px 4px rgba(0,0,0,0.25); }
    .pt-photo-busy { position: absolute; inset: 0; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; }
    .pt-name { font-weight: 700; font-size: 1.08rem; color: #1f2328; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pt-reg { font-size: 0.78rem; color: #6b7280; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .pt-reg i { font-size: 0.65rem; margin-right: 0.3rem; color: #9ca3af; }
    .pt-breed { font-size: 0.8rem; color: #6b7280; margin-top: 0.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pt-breed .dot { margin: 0 0.35rem; color: #c4c9d0; }

    .pt-icon-btn { width: 34px; height: 34px; border-radius: 9px; border: 1px solid transparent; background: transparent; color: #6b7280; display: flex; align-items: center; justify-content: center; transition: background 0.15s ease, border-color 0.15s ease; }
    .pt-icon-btn:hover, .pt-icon-btn.on { background: #f3f4f6; border-color: #e5e7eb; color: #1f2328; }
    .pt-menu { position: absolute; top: calc(100% + 6px); right: 0; min-width: 210px; background: #fff; border: 1px solid #e9ecef; border-radius: 12px; box-shadow: 0 16px 36px rgba(16,24,40,0.14); padding: 0.35rem; z-index: 1000; animation: ptMenu 0.16s ease-out; transform-origin: top right; }
    .pt-menu-item { display: flex; align-items: center; gap: 0.65rem; width: 100%; padding: 0.55rem 0.7rem; border: none; border-radius: 8px; background: transparent; color: #1f2328; font-size: 0.86rem; font-weight: 500; text-align: left; }
    .pt-menu-item i { width: 16px; text-align: center; color: #6b7280; font-size: 0.82rem; }
    .pt-menu-item:hover:not(:disabled) { background: #f6f7f9; }
    .pt-menu-item:disabled { opacity: 0.5; }
    .pt-menu-item.warn, .pt-menu-item.warn i { color: #8a6700; }
    .pt-menu-item.warn:hover { background: #fff8e1; }
    .pt-menu-item.danger, .pt-menu-item.danger i { color: #dc3545; }
    .pt-menu-item.danger:hover { background: #fff5f5; }
    .pt-menu-sep { height: 1px; background: #f0f1f3; margin: 0.3rem 0.2rem; }
    .pt-menu-note { display: flex; gap: 0.5rem; padding: 0.55rem 0.7rem; margin-top: 0.15rem; border-radius: 8px; background: #fafbfc; color: #6b7280; font-size: 0.75rem; line-height: 1.45; }
    .pt-menu-note i { margin-top: 2px; color: #9ca3af; }

    .pt-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.85rem; }
    .pt-chip { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; white-space: nowrap; }
    .pt-chip i { font-size: 0.65rem; }
    .pt-chip.green { background: rgba(25,135,84,0.1); color: #198754; }
    .pt-chip.grey { background: #f3f4f6; color: #6b7280; }
    .pt-chip.teal { background: rgba(10,162,192,0.1); color: #0a8aa3; }
    .pt-chip.pink { background: rgba(214,51,132,0.1); color: #c02a74; }
    .pt-chip.amber { background: rgba(255,193,7,0.16); color: #8a6700; }
    .pt-chip.red { background: rgba(220,53,69,0.1); color: #dc3545; }

    .pt-info { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1rem; padding: 0.85rem 0.95rem; border-radius: 12px; background: #fafbfc; border: 1px solid #f0f1f3; }
    .pt-info .k { font-size: 0.68rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.1rem; }
    .pt-info .v { font-size: 0.88rem; font-weight: 600; color: #1f2328; }
    .pt-last { display: flex; align-items: center; gap: 0.45rem; margin-top: 0.7rem; font-size: 0.8rem; color: #6b7280; }
    .pt-last i { color: #e0a800; font-size: 0.75rem; }
    .pt-last strong { color: #1f2328; font-weight: 600; }
    .pt-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: auto; padding-top: 0.9rem; }
    .pt-card .pt-info + .pt-foot, .pt-card .pt-last + .pt-foot { margin-top: auto; }
    .pt-card > .pt-foot { border-top: 1px solid #f0f1f3; margin-top: 0.9rem; }
    .pt-muted { font-size: 0.78rem; color: #6b7280; }

    .pt-note { display: flex; align-items: center; gap: 0.55rem; padding: 0.65rem 0.9rem; border-radius: 10px; font-size: 0.84rem; font-weight: 500; margin-bottom: 1rem; }
    .pt-note.warn { background: rgba(255,193,7,0.1); color: #8a6700; }
    .pt-note.danger { background: rgba(220,53,69,0.07); color: #b02a37; }

    .pt-empty { text-align: center; padding: 3.5rem 1.5rem; border: 1px dashed #e2e5ea; border-radius: 16px; background: #fcfcfd; }
    .pt-empty .ic { width: 68px; height: 68px; border-radius: 18px; margin: 0 auto 1rem; background: rgba(255,193,7,0.14); color: #e0a800; display: flex; align-items: center; justify-content: center; font-size: 1.7rem; }
    .pt-empty h5 { font-weight: 700; color: #1f2328; margin-bottom: 0.35rem; }
    .pt-empty p { color: #6b7280; font-size: 0.9rem; max-width: 420px; margin: 0 auto 1.25rem; }
    .pt-empty p:last-child { margin-bottom: 0; }

    .pt-skel-card { min-height: 220px; }
    .pt-skel { border-radius: 8px; background: linear-gradient(90deg, #f3f4f6 25%, #e9ebee 37%, #f3f4f6 63%); background-size: 400% 100%; animation: ptShimmer 1.3s ease infinite; }

    .pt-pager { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; margin-top: 1.5rem; }
    .pt-pager-text { font-size: 0.85rem; color: #6b7280; }
    .pt-pager-text strong { color: #1f2328; }
    .pt-page { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 36px; padding: 0 0.6rem; border-radius: 9px; border: 1px solid transparent; background: transparent; font-size: 0.85rem; font-weight: 600; color: #4b5563; transition: background 0.15s ease; }
    .pt-page:hover:not(:disabled) { background: #f3f4f6; }
    .pt-page.on { background: #ffc107; color: #1f2328; }
    .pt-page.nav { border-color: #e5e7eb; background: #fff; font-size: 0.75rem; }
    .pt-page:disabled { opacity: 0.4; cursor: not-allowed; }

    .pt-btn:focus-visible, .pt-tab:focus-visible, .pt-icon-btn:focus-visible, .pt-menu-item:focus-visible, .pt-page:focus-visible, .pt-photo:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    @media (max-width: 768px) {
      .pt-title { font-size: 1.45rem; }
      .pt-sub { font-size: 0.85rem; }
      .pt-grid { grid-template-columns: 1fr; gap: 0.85rem; }
      .pt-card { padding: 0.95rem; }
      .pt-photo { width: 56px; height: 56px; }
      .pt-toast { min-width: 0; width: calc(100% - 2rem); top: 76px; }
      .pt-tab { padding: 0.45rem 0.7rem; font-size: 0.8rem; }
    }
    @media (prefers-reduced-motion: reduce) {
      .pt-anim, .pt-menu, .pt-toast, .pt-skel { animation: none !important; }
      .pt-card, .pt-btn { transition: none !important; }
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
      console.log('🐾 Pets data:', petsResponse.data.pets?.map(p => ({ id: p.id, name: p.name, photo_url: p.photo_url })));
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

      // Every pet gets a QR code on registration (pets.qr_code).
      // Older pets without one fall back to their microchip record.
      setQrLoading(true);
      try {
        let qrCode = pet.qr_code;
        if (!qrCode && pet.microchip_number) {
          const microchipRes = await microchipAPI.getByPetId(petId);
          qrCode = microchipRes.data.microchip_record?.qr_code;
        }
        if (qrCode) {
            const jsonStr = atob(qrCode);
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
      return `https://api.petunity-muntinlupacity.com${photoUrl}`;
    }
    if (species === 'dog') return `/dog.png`;
    else if (species === 'cat') return `/cat.png`;
    return `/pet-default.png`;
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
      if (!blob) {
        setError('Failed to process image. Please try again.');
        setPhotoUploading(false);
        return;
      }
      try {
        const croppedFile = new File([blob], cropModal.file.name, { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('photo', croppedFile);
        formData.append('pet_id', cropModal.petId);
        await petAPI.uploadPhoto(cropModal.petId, formData);
        await loadPets();
        setCropModal(null);
      } catch (err) {
        const { message } = handleAPIError(err);
        setError(message);
      } finally {
        setPhotoUploading(false);
      }
    }, 'image/jpeg', 0.85);
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
  const initial = {
    name: pet.name,
    breed: pet.breed || '',
    birth_date: pet.birth_date && pet.birth_date !== '0000-00-00' ? pet.birth_date : '',
    weight: pet.weight || '',
    special_notes: pet.special_notes || '',
    sterilized: pet.sterilized || false,
    sterilized_by: pet.sterilized_by || '',
    sterilization_date: pet.sterilization_date || ''
  };
  setEditFormData(initial);
  setOriginalEditData(initial);
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
    setShowDeleteModal(false);

    try {
      await petAPI.delete(selectedPet.id);
      await loadPets();
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
    if (name === 'name') {
      if (value && !/^[a-zA-Z\s-]*$/.test(value)) return;
    }
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
    setShowEditModal(false);

    try {
      await petAPI.update(selectedPet.id, editFormData);
      setUpdateSuccess('Pet information updated successfully!');
      setTimeout(() => setUpdateSuccess(''), 3000);
      await loadPets();
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
      breed_other: '',
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
    } else if (name === 'name') {
      if (value && !/^[a-zA-Z\s-]*$/.test(value)) return;
      setRegisterFormData(prev => ({ ...prev, name: value }));
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

  const hasEditChanges = JSON.stringify(editFormData) !== JSON.stringify(originalEditData);

const handleRegisterPet = async (e) => {
    e.preventDefault();
    setRegisterLoading(true);
    setRegisterError('');
    setRegisterSuccess('');
    setShowRegisterModal(false);

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
        breed: registerFormData.breed === 'other' ? (registerFormData.breed_other?.trim() || 'Other') : registerFormData.breed,
        owner_id: ownerId
      };
      
      const response = await petAPI.create(submitData);
      setRegisterSuccess(`${registerFormData.name} has been successfully registered! Registration number: ${response.data.pet.registration_number}`);
      setTimeout(() => setUpdateSuccess(''), 3000);
      await loadPets();
    } catch (err) {
      const { message } = handleAPIError(err);
      setRegisterError(message);
    } finally {
      setRegisterLoading(false);
    }
  };

  const formatShortDate = (value) => {
    if (!value) return '—';
    const d = new Date(String(value).replace(' ', 'T'));
    return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isSterilized = (pet) => pet.sterilized === 1 || pet.sterilized === true || pet.sterilized === '1';

  // Shared pager for the three tabs
  const renderPager = (page, setPage, total) => {
    const totalPages = Math.ceil(total / itemsPerPage);
    if (totalPages <= 1) return null;
    let start = Math.max(1, page - 1);
    const end = Math.min(totalPages, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return (
      <div className="pt-pager pet-pagination">
        <span className="pt-pager-text">
          Showing <strong>{(page - 1) * itemsPerPage + 1}–{Math.min(page * itemsPerPage, total)}</strong> of {total}
        </span>
        <div className="d-flex align-items-center gap-1">
          <button type="button" className="pt-page nav" onClick={() => setPage(Math.max(page - 1, 1))} disabled={page === 1} aria-label="Previous page">
            <i className="fas fa-chevron-left" />
          </button>
          {pages.map(n => (
            <button key={n} type="button" className={`pt-page${n === page ? ' on' : ''}`} onClick={() => setPage(n)} aria-current={n === page ? 'page' : undefined}>{n}</button>
          ))}
          <button type="button" className="pt-page nav" onClick={() => setPage(Math.min(page + 1, totalPages))} disabled={page === totalPages} aria-label="Next page">
            <i className="fas fa-chevron-right" />
          </button>
        </div>
      </div>
    );
  };

  const renderEmpty = (icon, title, text, action) => (
    <div className="pt-empty pt-anim">
      <div className="ic"><i className={`fas ${icon}`} /></div>
      <h5>{title}</h5>
      <p>{text}</p>
      {action}
    </div>
  );

  const renderSkeleton = () => (
    <div className="pt-grid">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="pt-card pt-skel-card" style={{ opacity: 1 - i * 0.2 }}>
          <div className="d-flex gap-3 align-items-center mb-3">
            <div className="pt-skel" style={{ width: 64, height: 64, borderRadius: 14 }} />
            <div className="flex-grow-1">
              <div className="pt-skel mb-2" style={{ width: '60%', height: 14 }} />
              <div className="pt-skel" style={{ width: '40%', height: 10 }} />
            </div>
          </div>
          <div className="pt-skel mb-2" style={{ height: 60 }} />
          <div className="pt-skel" style={{ width: '50%', height: 10 }} />
        </div>
      ))}
    </div>
  );

  const tabs = [
    { key: 'active',   label: 'Active',   icon: 'fa-paw',     count: pets.length },
    { key: 'archived', label: 'Archived', icon: 'fa-archive', count: archivedPets.length },
    { key: 'trash',    label: 'Trash',    icon: 'fa-trash-alt', count: trashedPets.length },
  ];

  const switchTab = (key) => {
    if (key === activeTab) return;
    setShowDropdown(null);
    setActiveTab(key);
    if (key === 'active') setCurrentPage(1);
    if (key === 'archived') { setArchivePage(1); loadArchived(); }
    if (key === 'trash') { setTrashPage(1); loadTrash(); }
  };

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4 dashboard-page" style={{ backgroundColor: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4 pt-anim">
          <div>
            <h2 className="pt-title mobile-page-title">My Pets</h2>
            <p className="pt-sub">Register your pets and keep their health records in one place.</p>
          </div>
          {pets.length > 0 && activeTab === 'active' && (
            <button type="button" className="pt-btn primary lg" onClick={handleOpenRegisterModal}>
              <i className="fas fa-plus" />Register pet
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="pt-tabs mb-4 pt-anim" style={{ '--d': '0.05s' }} role="tablist">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={activeTab === t.key}
              className={`pt-tab ${t.key}${activeTab === t.key ? ' on' : ''}`}
              onClick={() => switchTab(t.key)}
            >
              <i className={`fas ${t.icon}`} />
              {t.label}
              <span className="count">{t.count}</span>
            </button>
          ))}
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius: '12px' }}>
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        {updateSuccess && (
          <div className="pt-toast" role="status">
            <div className="ic"><i className="fas fa-check" /></div>
            <div className="flex-grow-1">
              <div className="t">Success</div>
              <div className="d">{updateSuccess}</div>
            </div>
            <button type="button" className="pt-toast-close" onClick={() => setUpdateSuccess('')} aria-label="Close">
              <i className="fas fa-times" />
            </button>
          </div>
        )}

        {/* ===== ACTIVE VIEW ===== */}
        {activeTab === 'active' && (
          loading ? renderSkeleton() : pets.length === 0 ? (
            renderEmpty(
              'fa-paw',
              'No pets registered yet',
              'Register your first pet to keep track of its vaccinations and other health records.',
              <button type="button" className="pt-btn primary lg" onClick={handleOpenRegisterModal}>
                <i className="fas fa-plus" />Register your first pet
              </button>
            )
          ) : (
            <>
              <div className="pt-grid" style={{ flex: '1 1 auto', alignContent: 'flex-start' }}>
                {pets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((pet, index) => {
                  const hasRecords = checkPetHasRecords(pet);
                  const withCard = hasVetCard(pet.id);
                  const menuOpen = showDropdown === pet.id;
                  return (
                    <div key={pet.id} className={`pt-card pt-anim${menuOpen ? ' raised' : ''}`} style={{ '--d': `${0.08 + index * 0.06}s` }}>
                      {/* Top: photo, name, menu */}
                      <div className="pt-top">
                        <div
                          className="pt-photo"
                          role="button"
                          tabIndex={0}
                          title="View photo"
                          onClick={() => setPhotoPreview({
                            url: getPetImage(pet.species, pet.photo_url),
                            species: pet.species,
                            petId: pet.id,
                            hasPhoto: !!pet.photo_url
                          })}
                          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.click(); }}
                        >
                          <img
                            src={getPetImage(pet.species, pet.photo_url)}
                            alt={pet.name}
                            onError={(e) => e.target.src = '/pet-default.png'}
                          />
                          <div className="pt-photo-hover"><i className="fas fa-expand-alt" /></div>
                          <div className="pt-photo-cam"><i className="fas fa-camera" /></div>
                          {photoUploading && (
                            <div className="pt-photo-busy"><Spinner animation="border" size="sm" style={{ color: '#ffc107' }} /></div>
                          )}
                        </div>

                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <div className="pt-name mobile-pet-name" title={pet.name}>{pet.name}</div>
                          <div className="pt-reg mobile-pet-reg">
                            <i className="fas fa-hashtag" />{pet.registration_number}
                          </div>
                          <div className="pt-breed">
                            <span className="text-capitalize">{pet.species}</span>
                            <span className="dot">·</span>
                            {pet.breed || 'Mixed'}
                          </div>
                        </div>

                        {/* Menu */}
                        <div style={{ position: 'relative', alignSelf: 'flex-start' }}>
                          <button
                            type="button"
                            className={`pt-icon-btn${menuOpen ? ' on' : ''}`}
                            onClick={() => setShowDropdown(menuOpen ? null : pet.id)}
                            aria-label={`More options for ${pet.name}`}
                            aria-expanded={menuOpen}
                          >
                            <i className="fas fa-ellipsis-v" />
                          </button>

                          {menuOpen && (
                            <>
                              <div onClick={() => setShowDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
                              <div className="pt-menu" role="menu">
                                <button type="button" role="menuitem" className="pt-menu-item" disabled={detailsLoading}
                                  onClick={() => { setShowDropdown(null); loadPetDetails(pet.id); }}>
                                  <i className="fas fa-eye" />View details
                                </button>
                                {withCard && (
                                  <button type="button" role="menuitem" className="pt-menu-item"
                                    onClick={() => { setShowDropdown(null); handleViewVetCard(pet.id); }}>
                                    <i className="fas fa-id-card" />View vet card
                                  </button>
                                )}
                                {!hasRecords && (
                                  <button type="button" role="menuitem" className="pt-menu-item"
                                    onClick={() => { setShowDropdown(null); handleEditPet(pet); }}>
                                    <i className="fas fa-pen" />Edit info
                                  </button>
                                )}
                                <div className="pt-menu-sep" />
                                <button type="button" role="menuitem" className="pt-menu-item warn"
                                  onClick={() => { setShowDropdown(null); handleArchivePet(pet); }}>
                                  <i className="fas fa-archive" />Archive pet
                                </button>
                                {!hasRecords ? (
                                  <button type="button" role="menuitem" className="pt-menu-item danger"
                                    onClick={() => { setShowDropdown(null); handleDeletePet(pet); }}>
                                    <i className="fas fa-trash-alt" />Remove pet
                                  </button>
                                ) : (
                                  <div className="pt-menu-note">
                                    <i className="fas fa-lock" />
                                    This pet has health records, so it can't be edited or removed.
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status chips */}
                      <div className="pt-chips">
                        <span className={`pt-chip ${withCard ? 'green' : 'grey'}`}>
                          <i className={`fas ${withCard ? 'fa-id-card' : 'fa-id-card'}`} />{withCard ? 'Vet card' : 'No vet card'}
                        </span>
                        {isSterilized(pet) && (
                          <span className="pt-chip teal"><i className="fas fa-cut" />{getSterilizationLabel(pet.gender)}</span>
                        )}
                        {pet.microchip_number && (
                          <span className="pt-chip pink"><i className="fas fa-microchip" />Microchipped</span>
                        )}
                      </div>

                      {/* Details */}
                      <div className="pt-info mobile-pet-body">
                        <div>
                          <div className="k mobile-pet-label">Gender</div>
                          <div className="v text-capitalize mobile-pet-value">{pet.gender || '—'}</div>
                        </div>
                        <div>
                          <div className="k mobile-pet-label">Age</div>
                          <div className="v mobile-pet-value">{calculateAge(pet.birth_date)}</div>
                        </div>
                        <div>
                          <div className="k mobile-pet-label">Color</div>
                          <div className="v mobile-pet-value">{pet.color || '—'}</div>
                        </div>
                        <div>
                          <div className="k mobile-pet-label">Vaccinations</div>
                          <div className="v mobile-pet-value">
                            {pet.vaccination_count || 0} record{Number(pet.vaccination_count) === 1 ? '' : 's'}
                          </div>
                        </div>
                      </div>

                      {pet.last_vaccination_date && (
                        <div className="pt-last">
                          <i className="fas fa-syringe" />
                          Last vaccination: <strong>{formatShortDate(pet.last_vaccination_date)}</strong>
                        </div>
                      )}

                      {/* Footer */}
                      <div className="pt-foot mobile-pet-footer">
                        <span className="pt-muted">
                          <i className="far fa-calendar me-1" />Registered {formatShortDate(pet.created_at)}
                        </span>
                        <button type="button" className="pt-btn ghost sm" disabled={detailsLoading} onClick={() => loadPetDetails(pet.id)}>
                          View details<i className="fas fa-arrow-right" style={{ fontSize: '0.7rem' }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {renderPager(currentPage, setCurrentPage, pets.length)}
            </>
          )
        )}

        {/* ===== ARCHIVED VIEW ===== */}
        {activeTab === 'archived' && (
          archiveLoading ? renderSkeleton() : archivedPets.length === 0 ? (
            renderEmpty('fa-archive', 'No archived pets', 'Pets you archive will show here. You can bring them back anytime.')
          ) : (
            <>
              <div className="pt-note warn pt-anim">
                <i className="fas fa-info-circle" />
                Archived pets are hidden from your active list. You can unarchive them anytime.
              </div>
              <div className="pt-grid" style={{ flex: '1 1 auto', alignContent: 'flex-start' }}>
                {archivedPets.slice((archivePage - 1) * itemsPerPage, archivePage * itemsPerPage).map((pet, index) => (
                  <div key={pet.id} className="pt-card muted pt-anim" style={{ '--d': `${0.08 + index * 0.06}s` }}>
                    <div className="pt-top">
                      <div className="pt-photo static">
                        <img src={getPetImage(pet.species, pet.photo_url)} alt={pet.name} style={{ filter: 'grayscale(40%)' }} onError={(e) => e.target.src = '/pet-default.png'} />
                      </div>
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="pt-name" title={pet.name}>{pet.name}</div>
                        <div className="pt-reg"><i className="fas fa-hashtag" />{pet.registration_number}</div>
                        <div className="pt-breed"><span className="text-capitalize">{pet.species}</span><span className="dot">·</span>{pet.breed || 'Mixed'}</div>
                      </div>
                      <span className="pt-chip amber" style={{ alignSelf: 'flex-start' }}><i className="fas fa-archive" />Archived</span>
                    </div>
                    <div className="pt-info">
                      <div>
                        <div className="k">Gender</div>
                        <div className="v text-capitalize">{pet.gender || '—'}</div>
                      </div>
                      <div>
                        <div className="k">Vaccinations</div>
                        <div className="v">{pet.vaccination_count || 0} record{Number(pet.vaccination_count) === 1 ? '' : 's'}</div>
                      </div>
                    </div>
                    <div className="pt-foot">
                      <span className="pt-muted"><i className="far fa-calendar me-1" />Registered {formatShortDate(pet.created_at)}</span>
                      <button type="button" className="pt-btn amber sm" onClick={() => handleUnarchivePet(pet)}>
                        <i className="fas fa-box-open" />Unarchive
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {renderPager(archivePage, setArchivePage, archivedPets.length)}
            </>
          )
        )}

        {/* ===== TRASH VIEW ===== */}
        {activeTab === 'trash' && (
          trashLoading ? renderSkeleton() : trashedPets.length === 0 ? (
            renderEmpty('fa-trash-alt', 'Trash is empty', 'Removed pets stay here for 30 days before they are deleted for good.')
          ) : (
            <>
              <div className="pt-note danger pt-anim">
                <i className="fas fa-info-circle" />
                Pets in the trash are deleted for good after 30 days.
              </div>
              <div className="pt-grid" style={{ flex: '1 1 auto', alignContent: 'flex-start' }}>
                {trashedPets.slice((trashPage - 1) * itemsPerPage, trashPage * itemsPerPage).map((pet, index) => {
                  const daysLeft = getDaysUntilPermanentDelete(pet.deleted_at);
                  const urgency = daysLeft <= 5 ? 'red' : daysLeft <= 10 ? 'amber' : 'grey';
                  return (
                    <div key={pet.id} className="pt-card muted pt-anim" style={{ '--d': `${0.08 + index * 0.06}s` }}>
                      <div className="pt-top">
                        <div className="pt-photo static">
                          <img src={getPetImage(pet.species, pet.photo_url)} alt={pet.name} style={{ filter: 'grayscale(60%)' }} onError={(e) => e.target.src = '/pet-default.png'} />
                        </div>
                        <div className="flex-grow-1" style={{ minWidth: 0 }}>
                          <div className="pt-name" title={pet.name}>{pet.name}</div>
                          <div className="pt-reg"><i className="fas fa-hashtag" />{pet.registration_number}</div>
                          <div className="pt-breed"><span className="text-capitalize">{pet.species}</span><span className="dot">·</span>{pet.breed || 'Mixed'}</div>
                        </div>
                        <span className={`pt-chip ${urgency}`} style={{ alignSelf: 'flex-start' }}>
                          <i className="fas fa-hourglass-half" />{daysLeft} day{daysLeft === 1 ? '' : 's'} left
                        </span>
                      </div>
                      <div className="pt-info">
                        <div>
                          <div className="k">Gender</div>
                          <div className="v text-capitalize">{pet.gender || '—'}</div>
                        </div>
                        <div>
                          <div className="k">Removed on</div>
                          <div className="v" style={{ color: '#dc3545' }}>{formatShortDate(pet.deleted_at)}</div>
                        </div>
                      </div>
                      <div className="d-flex gap-2 mt-auto pt-2">
                        <button type="button" className="pt-btn success sm flex-fill" onClick={() => handleRestorePet(pet)}>
                          <i className="fas fa-undo" />Restore
                        </button>
                        <button type="button" className="pt-btn danger-outline sm flex-fill" onClick={() => handleForceDeletePet(pet)}>
                          <i className="fas fa-times" />Delete forever
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              {renderPager(trashPage, setTrashPage, trashedPets.length)}
            </>
          )
        )}

      {/* ===== ARCHIVE MODAL ===== */}
      <Modal show={showArchiveModal} onHide={() => setShowArchiveModal(false)} centered style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #856404' }}>
          <Modal.Title style={{ fontWeight: '700' }}>
            <i className="fas fa-archive me-2" style={{ color: '#856404' }}></i>Archive Pet
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {selectedPet && (
            <>
              <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
                Are you sure you want to archive <strong style={{ color: '#856404' }}>{selectedPet.name}</strong>? The pet will become inactive.
              </p>
              <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #856404' }}>
                <strong style={{ fontSize: '1.1rem' }}>{selectedPet.name}</strong><br />
                <small className="text-muted">
                  <i className="fas fa-id-card me-1"></i>
                  {selectedPet.registration_number} • <span className="text-capitalize">{selectedPet.species}</span> • {selectedPet.breed || 'Mixed'}
                </small>
              </div>
              <Alert variant="warning" className="mt-3 mb-0">
                <i className="fas fa-info-circle me-2"></i>
                <strong>Note:</strong> All existing records are preserved. The pet will not appear in active listings. You can unarchive anytime.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          <Button variant="secondary" onClick={() => setShowArchiveModal(false)} disabled={archiveActionLoading} style={{ borderRadius: '8px', fontWeight: '600' }}>Cancel</Button>
          <Button onClick={confirmArchivePet} disabled={archiveActionLoading} style={{ background: '#856404', border: 'none', borderRadius: '8px', fontWeight: '600', padding: '0.75rem 1.5rem' }}>
            {archiveActionLoading ? <WaveDots color="#fff" /> : <><i className="fas fa-archive me-2"></i>Archive Pet</>}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===== UNARCHIVE MODAL ===== */}
      <Modal show={showUnarchiveModal} onHide={() => setShowUnarchiveModal(false)} centered style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #856404' }}>
          <Modal.Title style={{ fontWeight: '700' }}>
            <i className="fas fa-box-open me-2" style={{ color: '#856404' }}></i>Unarchive Pet
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {selectedPet && (
            <>
              <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
                Restore <strong style={{ color: '#856404' }}>{selectedPet.name}</strong> back to your active pets?
              </p>
              <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #856404' }}>
                <strong style={{ fontSize: '1.1rem' }}>{selectedPet.name}</strong><br />
                <small className="text-muted">
                  <i className="fas fa-id-card me-1"></i>
                  {selectedPet.registration_number} • <span className="text-capitalize">{selectedPet.species}</span> • {selectedPet.breed || 'Mixed'}
                </small>
              </div>
              <Alert variant="success" className="mt-3 mb-0">
                <i className="fas fa-info-circle me-2"></i>
                <strong>Note:</strong> This pet and all its records will become visible again in your active list.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          <Button variant="secondary" onClick={() => setShowUnarchiveModal(false)} disabled={archiveActionLoading} style={{ borderRadius: '8px', fontWeight: '600' }}>Cancel</Button>
          <Button onClick={confirmUnarchivePet} disabled={archiveActionLoading} style={{ background: '#856404', border: 'none', borderRadius: '8px', fontWeight: '600', padding: '0.75rem 1.5rem' }}>
            {archiveActionLoading ? <WaveDots color="#fff" /> : <><i className="fas fa-box-open me-2"></i>Unarchive Pet</>}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===== RESTORE MODAL ===== */}
      <Modal show={showRestoreModal} onHide={() => setShowRestoreModal(false)} centered style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #198754' }}>
          <Modal.Title style={{ fontWeight: '700' }}>
            <i className="fas fa-undo text-success me-2"></i>Restore Pet
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {selectedPet && (
            <>
              <p style={{ fontSize: '1rem', marginBottom: '1.5rem' }}>
                Are you sure you want to restore this pet back to your active list?
              </p>
              <div style={{ background: '#f8f9fa', padding: '1.25rem', borderRadius: '8px', borderLeft: '4px solid #198754' }}>
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
              <Alert variant="success" className="mt-3 mb-0">
                <i className="fas fa-info-circle me-2"></i>
                <strong>Note:</strong> This pet and all its associated records will be fully restored and visible again.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          <Button variant="secondary" onClick={() => setShowRestoreModal(false)} disabled={restoreLoading} style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
            Cancel
          </Button>
          <Button variant="success" onClick={confirmRestorePet} disabled={restoreLoading} style={{ borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
            {restoreLoading ? <WaveDots color="#fff" /> : <><i className="fas fa-undo me-2"></i>Restore Pet</>}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* ===== FORCE DELETE MODAL ===== */}
      <Modal show={showForceDeleteModal} onHide={() => setShowForceDeleteModal(false)} centered style={{ zoom: '0.75' }}>
        <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #dc3545' }}>
          <Modal.Title style={{ fontWeight: '700' }}>
            <i className="fas fa-exclamation-triangle text-danger me-2"></i>Permanently Delete
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '2rem' }}>
          {selectedPet && (
            <>
              <p style={{ fontSize: '1rem' }}>
                Permanently delete <strong style={{ color: '#dc3545' }}>{selectedPet.name}</strong>? This cannot be undone.
              </p>
              <Alert variant="danger" className="mb-0">
                <i className="fas fa-skull-crossbones me-2"></i>
                <strong>Warning:</strong> All records associated with this pet will be permanently erased from the system.
              </Alert>
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem' }}>
          <Button variant="secondary" onClick={() => setShowForceDeleteModal(false)} disabled={forceDeleteLoading} style={{ borderRadius: '8px', fontWeight: '600' }}>Cancel</Button>
          <Button variant="danger" onClick={confirmForceDeletePet} disabled={forceDeleteLoading} style={{ borderRadius: '8px', fontWeight: '600' }}>
            {forceDeleteLoading ? <WaveDots color="#fff" /> : <><i className="fas fa-times me-1"></i>Delete Forever</>}
          </Button>
        </Modal.Footer>
      </Modal>

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
        <Alert variant="success" className="mb-3" style={{ borderRadius: '12px', border: '2px solid #198754', background: 'linear-gradient(135deg, rgba(25,135,84,0.12), rgba(25,135,84,0.06))', color: '#198754', fontWeight: '600', fontSize: '0.95rem', boxShadow: '0 4px 16px rgba(25,135,84,0.15)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <i className="fas fa-check-circle" style={{ fontSize: '1.4rem', flexShrink: 0 }}></i>
          <div>
            <div style={{ fontWeight: '700', fontSize: '1rem' }}>Pet Registered Successfully!</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>{registerSuccess}</div>
          </div>
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
              <option value="other">Other</option>
            </Form.Select>
          {registerFormData.breed === 'other' && (
            <Form.Control
              type="text"
              name="breed_other"
              value={registerFormData.breed_other || ''}
              onChange={handleRegisterFormChange}
              placeholder="Please specify breed"
              disabled={registerLoading}
              className="mt-2"
              style={{ borderRadius: '8px', padding: '0.75rem', border: '2px solid #ffc107' }}
            />
          )}
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
          <WaveDots />
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

                {(petDetails.qr_code || petDetails.microchip_number) && (
                  <Card className="border-0 mb-3" style={{ borderRadius: '15px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
                    <Card.Header style={{ background: 'rgba(67,97,238,0.08)', borderBottom: '2px solid rgba(67,97,238,0.2)', borderRadius: '15px 15px 0 0' }}>
                      <h6 className="mb-0" style={{ fontWeight: '700', color: '#333333' }}>
                        <i className="fas fa-qrcode me-2" style={{ color: '#4361ee' }}></i>
                        Pet QR Code
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
                          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem', fontFamily: 'monospace' }}>{petDetails.registration_number}</div>
                          {petDetails.microchip_number && (
                            <div style={{ fontSize: '0.72rem', color: '#aaa', fontFamily: 'monospace' }}>Microchip: {petDetails.microchip_number}</div>
                          )}
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = qrDataURL;
                              link.download = `QR_${petDetails.name}_${petDetails.registration_number}.png`;
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
<Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" style={{ zoom: '0.75' }}>
  <Modal.Header 
  closeButton
  style={{
    background: '#f8f9fa',
    borderBottom: '2px solid #ffc107',
    borderRadius: '20px 20px 0 0'
  }}
>
  <Modal.Title style={{ color: '#333333', fontWeight: '700' }}>
    <i className="fas fa-edit me-2"></i>
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
        disabled={updateLoading || !hasEditChanges}
        className="border-0"
        style={{
          background: updateLoading || !hasEditChanges ? '#6c757d' : '#ffc107',
          color: '#000000',
          borderRadius: '8px',
          padding: '0.75rem 1.5rem',
          fontWeight: '700',
          boxShadow: updateLoading || !hasEditChanges ? 'none' : '0 4px 15px rgba(255, 193, 7, 0.4)',
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
          <WaveDots />
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
        <WaveDots color="#ffffff" />
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
                  <WaveDots />
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
            handlePetPhotoUpload(petId, file);
            setPhotoPreview(null);
          }
          e.target.value = '';
        }}
      />
    </>
  );
};

export default PetStatus;