import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Alert, Spinner, Badge, Modal, Form } from 'react-bootstrap';
import { petAPI, ownerAPI, microchipAPI, vetCardAPI, handleAPIError } from '../../services/api';

const WaveDots = ({ color = '#000000' }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '1rem' }}>
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0s' }} />
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0.15s' }} />
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0.3s' }} />
  </span>
);

// Small centered confirmation modal used for archive / unarchive / restore / remove / delete
const ConfirmModal = ({ show, onHide, color, icon, title, text, pet, note, confirmLabel, confirmIcon, onConfirm, loading }) => (
  <Modal show={show} onHide={() => !loading && onHide()} centered dialogClassName="cm-modal" className="pt-modal">
    <Modal.Body className="cm-body">
      <div className="cm-icon" style={{ '--c': color }}><i className={`fas ${icon}`} /></div>
      <h5 className="cm-title">{title}</h5>
      <p className="cm-text">{text}</p>
      {pet && (
        <div className="cm-pet">
          <div className="cm-pet-av"><i className={`fas ${String(pet.species).toLowerCase() === 'cat' ? 'fa-cat' : 'fa-dog'}`} /></div>
          <div style={{ minWidth: 0 }}>
            <div className="cm-pet-name">{pet.name}</div>
            <div className="cm-pet-meta">
              {pet.registration_number} · <span className="text-capitalize">{pet.species}</span> · {pet.breed || 'Mixed'}
            </div>
          </div>
        </div>
      )}
      {note && (
        <div className="cm-note" style={{ '--c': color }}>
          <i className="fas fa-info-circle" />
          <span>{note}</span>
        </div>
      )}
    </Modal.Body>
    <Modal.Footer className="cm-foot">
      <button type="button" className="pt-btn ghost" onClick={onHide} disabled={loading}>Cancel</button>
      <button type="button" className="pt-btn cm-confirm" style={{ '--c': color }} onClick={onConfirm} disabled={loading}>
        {loading ? <WaveDots color="#fff" /> : <><i className={`fas ${confirmIcon}`} />{confirmLabel}</>}
      </button>
    </Modal.Footer>
  </Modal>
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
    @media (max-width: 768px)  { .dashboard-page { zoom: 1; padding-left: 0.75rem !important; padding-right: 0.75rem !important; } }

    /* Small confirmation modals (archive, restore, remove, delete) */
    .cm-modal { max-width: 420px; }
    .cm-modal .modal-content { border: none; border-radius: 16px; overflow: hidden; box-shadow: 0 24px 60px rgba(16,24,40,0.2); }
    @keyframes cmPop { 0% { transform: scale(0.7); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
    .cm-body { padding: 1.75rem 1.6rem 1.25rem !important; text-align: center; }
    .cm-icon { width: 58px; height: 58px; border-radius: 16px; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.45rem; color: var(--c); background: color-mix(in srgb, var(--c) 13%, #fff); animation: cmPop 0.4s ease-out; }
    .cm-title { font-weight: 700; color: #1f2328; margin-bottom: 0.35rem; font-size: 1.15rem; word-break: break-word; }
    .cm-text { font-size: 0.88rem; color: #6b7280; margin-bottom: 1.1rem; line-height: 1.55; }
    .cm-pet { display: flex; align-items: center; gap: 0.7rem; text-align: left; padding: 0.7rem 0.85rem; border: 1px solid #eef0f3; border-radius: 12px; background: #fafbfc; }
    .cm-pet-av { width: 38px; height: 38px; border-radius: 10px; background: rgba(255,193,7,0.16); color: #b88a00; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .cm-pet-name { font-weight: 700; color: #1f2328; font-size: 0.94rem; }
    .cm-pet-meta { font-size: 0.76rem; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .cm-note { display: flex; gap: 0.5rem; align-items: flex-start; text-align: left; margin-top: 0.8rem; padding: 0.65rem 0.8rem; border-radius: 10px; font-size: 0.8rem; line-height: 1.5; color: color-mix(in srgb, var(--c) 80%, #000); background: color-mix(in srgb, var(--c) 7%, #fff); border: 1px solid color-mix(in srgb, var(--c) 22%, #fff); }
    .cm-note i { margin-top: 3px; }
    .cm-foot { border-top: 1px solid #eef0f3 !important; padding: 0.9rem 1.4rem !important; gap: 0.6rem; flex-wrap: nowrap !important; }
    .cm-foot .pt-btn { flex: 1; margin: 0; padding: 0.62rem; }
    .cm-confirm { background: var(--c); color: #fff; }
    .cm-confirm:hover:not(:disabled) { background: color-mix(in srgb, var(--c) 85%, #000); color: #fff; }
    @media (prefers-reduced-motion: reduce) { .cm-icon { animation: none; } }

    /* Register / View / Edit pet modals */
    .pm-modal { max-width: 640px; }
    .pm-modal.lg { max-width: 860px; }
    .pm-modal .modal-content { border: none; border-radius: 16px; overflow: hidden; box-shadow: 0 24px 60px rgba(16,24,40,0.2); }
    .pm-head { align-items: flex-start !important; padding: 1.25rem 1.5rem !important; border-bottom: 1px solid #eef0f3 !important; background: linear-gradient(180deg, #fffaeb 0%, #fff 100%); }
    .pm-head-main { display: flex; gap: 0.9rem; align-items: center; min-width: 0; flex: 1; }
    .pm-head-ic { width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: #b88a00; background: rgba(255,193,7,0.18); }
    .pm-kicker { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #b88a00; }
    .pm-title { font-size: 1.2rem; font-weight: 700; color: #1f2328; margin: 0; line-height: 1.3; word-break: break-word; }
    .pm-head-sub { font-size: 0.8rem; color: #6b7280; margin-top: 0.15rem; }
    .pm-req { color: #dc3545; }
    .pm-hero-photo { width: 72px; height: 72px; border-radius: 18px; object-fit: cover; border: 3px solid #fff; box-shadow: 0 6px 18px rgba(16,24,40,0.12); background: #fff; flex-shrink: 0; }
    .pm-reg { display: inline-block; margin-top: 0.3rem; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.78rem; font-weight: 600; color: #1f2328; background: #f3f4f6; padding: 0.15rem 0.55rem; border-radius: 999px; }
    .pm-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.5rem; }
    .pm-chip { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.74rem; font-weight: 600; color: #4b5563; background: #fff; border: 1px solid #e9ecef; padding: 0.18rem 0.6rem; border-radius: 999px; }
    .pm-chip i { color: #b88a00; }
    .pm-chip.ok { color: #198754; border-color: rgba(25,135,84,0.25); background: rgba(25,135,84,0.06); }
    .pm-chip.ok i { color: #198754; }
    .pm-body { padding: 1.4rem 1.5rem !important; }
    .pm-section { margin-bottom: 1.4rem; }
    .pm-section-title { display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 0.75rem; }
    .pm-section-title i { color: #e0a800; font-size: 0.8rem; }
    .pm-label { font-size: 0.84rem; font-weight: 600; color: #374151; margin-bottom: 0.35rem; }
    .pm-input { border-radius: 10px !important; border: 1.5px solid #e5e7eb !important; padding: 0.62rem 0.8rem !important; font-size: 0.92rem; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .pm-input:focus { border-color: #ffc107 !important; box-shadow: 0 0 0 3px rgba(255,193,7,0.18) !important; }
    .pm-input:disabled { background-color: #f8f9fa; }
    .pm-hint { font-size: 0.78rem; margin-top: 0.35rem; color: #6b7280; display: flex; align-items: center; gap: 0.35rem; }
    .pm-hint.ok { color: #198754; font-weight: 600; }
    .pm-suffix { position: relative; }
    .pm-suffix .pm-input { padding-right: 2.6rem !important; }
    .pm-suffix span { position: absolute; right: 0.85rem; top: 50%; transform: translateY(-50%); font-size: 0.82rem; font-weight: 600; color: #9ca3af; pointer-events: none; }
    .pm-species { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
    .pm-species-btn { position: relative; display: flex; align-items: center; justify-content: center; gap: 0.55rem; padding: 0.8rem; border-radius: 12px; border: 1.5px solid #e5e7eb; background: #fff; font-weight: 700; color: #374151; font-size: 0.95rem; transition: all 0.15s ease; }
    .pm-species-btn i:first-child { font-size: 1.15rem; color: #9ca3af; }
    .pm-species-btn:hover:not(:disabled) { border-color: #ffd65c; }
    .pm-species-btn.on { border-color: #ffc107; background: #fffaeb; color: #1f2328; box-shadow: 0 0 0 3px rgba(255,193,7,0.15); }
    .pm-species-btn.on i:first-child { color: #e0a800; }
    .pm-species-check { position: absolute; top: 6px; right: 8px; color: #e0a800; font-size: 0.85rem; }
    .pm-hidden-req { position: absolute; opacity: 0; width: 1px; height: 1px; pointer-events: none; }
    .pm-toggle { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.85rem 1rem; border: 1.5px solid #e5e7eb; border-radius: 12px; cursor: pointer; margin-bottom: 0.75rem; transition: border-color 0.15s ease, background 0.15s ease; }
    .pm-toggle.on { border-color: rgba(25,135,84,0.35); background: #f6fbf8; }
    .pm-toggle-title { font-weight: 700; color: #1f2328; font-size: 0.92rem; }
    .pm-toggle-sub { font-size: 0.78rem; color: #6b7280; }
    .pm-switch { margin: 0; padding-left: 2.6em; min-height: 0; }
    .pm-switch .form-check-input { width: 2.4em; height: 1.3em; margin-left: -2.6em; cursor: pointer; }
    .pm-switch .form-check-input:checked { background-color: #198754; border-color: #198754; }
    .pm-switch .form-check-input:focus { box-shadow: 0 0 0 3px rgba(25,135,84,0.15); }
    .pm-alert { display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.75rem 0.9rem; border-radius: 10px; font-size: 0.86rem; margin-bottom: 1rem; }
    .pm-alert i { margin-top: 3px; }
    .pm-alert.danger { background: rgba(220,53,69,0.07); border: 1px solid rgba(220,53,69,0.25); color: #b02a37; }
    .pm-alert.success { background: rgba(25,135,84,0.07); border: 1px solid rgba(25,135,84,0.25); color: #146c43; }
    .pm-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
    .pm-info { display: flex; gap: 0.65rem; align-items: flex-start; padding: 0.7rem 0.8rem; border: 1px solid #eef0f3; border-radius: 12px; background: #fafbfc; }
    .pm-info-ic { width: 30px; height: 30px; border-radius: 9px; background: #fff; border: 1px solid #eef0f3; color: #9ca3af; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; flex-shrink: 0; }
    .pm-info-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
    .pm-info-value { font-size: 0.9rem; font-weight: 600; color: #1f2328; word-break: break-word; }
    .pm-info-extra { font-size: 0.74rem; color: #6b7280; margin-top: 0.1rem; }
    .pm-notes { margin-top: 1rem; padding: 0.85rem 1rem; border-radius: 12px; background: #fffaeb; border: 1px solid rgba(255,193,7,0.3); }
    .pm-notes p { margin: 0; font-size: 0.88rem; color: #374151; white-space: pre-line; }
    .pm-vax-list { display: flex; flex-direction: column; }
    .pm-vax { display: flex; gap: 0.75rem; padding: 0.7rem 0; border-bottom: 1px solid #f1f3f5; }
    .pm-vax:last-child { border-bottom: none; }
    .pm-vax-dot { width: 10px; height: 10px; border-radius: 50%; background: #198754; margin-top: 0.4rem; flex-shrink: 0; box-shadow: 0 0 0 4px rgba(25,135,84,0.12); }
    .pm-vax-dot.due { background: #e0a800; box-shadow: 0 0 0 4px rgba(255,193,7,0.18); }
    .pm-vax-name { font-size: 0.9rem; color: #1f2328; }
    .pm-vax-meta { font-size: 0.78rem; color: #6b7280; margin-top: 0.1rem; }
    .pm-vax-meta i { margin-right: 0.3rem; color: #9ca3af; }
    .pm-pill { font-size: 0.68rem; font-weight: 700; padding: 0.12rem 0.55rem; border-radius: 999px; white-space: nowrap; }
    .pm-pill.ok { color: #198754; background: rgba(25,135,84,0.1); }
    .pm-pill.warn { color: #946200; background: rgba(255,193,7,0.2); }
    .pm-more { font-size: 0.78rem; color: #6b7280; padding-top: 0.5rem; }
    .pm-empty { display: flex; gap: 0.8rem; align-items: center; padding: 0.9rem 1rem; border: 1px dashed #e5e7eb; border-radius: 12px; }
    .pm-empty > i { width: 38px; height: 38px; border-radius: 10px; background: #f3f4f6; color: #9ca3af; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .pm-empty strong { display: block; font-size: 0.88rem; color: #1f2328; }
    .pm-empty span { font-size: 0.78rem; color: #6b7280; }
    .pm-qr-card { border: 1px solid #eef0f3; border-radius: 14px; padding: 1.1rem; text-align: center; background: #fff; }
    .pm-qr-img { width: 180px; max-width: 100%; height: auto; border-radius: 12px; border: 1px solid #eef0f3; padding: 6px; background: #fff; }
    .pm-qr-code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.8rem; font-weight: 600; color: #1f2328; margin-top: 0.5rem; }
    .pm-qr-note { font-size: 0.76rem; color: #6b7280; margin: 0.4rem 0 0.85rem; line-height: 1.5; }
    .pm-qr-skel { width: 180px; height: 180px; margin: 0 auto; border-radius: 12px; background: linear-gradient(90deg, #f0f1f3 25%, #e6e8eb 50%, #f0f1f3 75%); background-size: 400% 100%; animation: ptShimmer 1.3s ease-in-out infinite; }
    .pm-qr-none { color: #9ca3af; font-size: 0.85rem; padding: 1.5rem 0; }
    .pm-qr-none i { display: block; font-size: 2rem; color: #e5e7eb; margin-bottom: 0.4rem; }
    .pm-foot { padding: 0.9rem 1.5rem !important; border-top: 1px solid #eef0f3 !important; display: flex; justify-content: flex-end; align-items: center; gap: 0.6rem; }
    .pm-foot-note { font-size: 0.8rem; color: #9ca3af; margin-right: auto; }
    .pm-foot-btns { display: flex; gap: 0.6rem; }
    @media (max-width: 768px) {
      .pm-head { padding: 1rem !important; }
      .pm-head-ic { width: 40px; height: 40px; }
      .pm-hero-photo { width: 60px; height: 60px; border-radius: 15px; }
      .pm-title { font-size: 1.08rem; }
      .pm-body { padding: 1rem !important; }
      .pm-info { padding: 0.6rem 0.65rem; gap: 0.5rem; }
      .pm-info-ic { display: none; }
      .pm-info-value { font-size: 0.86rem; }
      .pm-foot { padding: 0.75rem 1rem !important; flex-wrap: wrap; }
      .pm-foot-note:empty { display: none; }
      .pm-foot-note { width: 100%; text-align: center; margin: 0; }
      .pm-foot > .pt-btn, .pm-foot-btns { flex: 1; }
      .pm-foot-btns .pt-btn { flex: 1; }
    }

    /* Modals: same zoom as the page, but normal size on phones so they stay centered */
    .pt-modal { zoom: 0.75; }
    @media (min-width: 1600px) { .pt-modal { zoom: 0.9; } }
    @media (min-width: 1920px) { .pt-modal { zoom: 1; } }
    @media (max-width: 768px) {
      .pt-modal { zoom: 1; }
      .pt-modal .modal-dialog { margin: 0.75rem auto; max-width: calc(100% - 1.5rem); display: flex; align-items: center; min-height: calc(100% - 1.5rem); }
      .pt-modal .modal-content { border-radius: 16px; }
      .pt-modal .modal-header { padding: 0.9rem 1rem !important; }
      .pt-modal .modal-title { font-size: 1.05rem !important; }
      .pt-modal .modal-body { padding: 1rem !important; max-height: calc(100vh - 170px) !important; }
      .pt-modal .modal-footer { padding: 0.75rem 1rem !important; gap: 0.5rem; flex-wrap: wrap; }
      .pt-modal .modal-footer > * { flex: 1 1 auto; margin: 0 !important; }
    }

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

    .pt-empty { text-align: center; padding: 6rem 1.5rem; border: none; border-radius: 20px; background: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .pt-empty .ic { width: 90px; height: 90px; border-radius: 50%; margin: 0 auto 1.5rem; background: rgba(255,193,7,0.1); border: 2px solid #ffc107; color: #ffc107; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; }
    .pt-empty h5 { font-size: 1.5rem; font-weight: 800; color: #1a1a1a; margin-bottom: 0.5rem; }
    .pt-empty p { color: #6c757d; font-size: 1rem; line-height: 1.65; max-width: 420px; margin: 0 auto 1.5rem; }
    .pt-empty .pt-btn.lg { font-size: 1.25rem; font-weight: 700; padding: 0.875rem 2.5rem; border-radius: 14px; background: linear-gradient(135deg, #ffc107, #ffb300); color: #000; box-shadow: 0 6px 20px rgba(255,193,7,0.4); }
    .pt-empty .pt-btn.lg:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(255,193,7,0.6); }
    @media (max-width: 768px) {
      .pt-empty { padding: 3rem 1.25rem; }
      .pt-empty .ic { width: 72px; height: 72px; font-size: 2rem; }
      .pt-empty h5 { font-size: 1.25rem; }
      .pt-empty .pt-btn.lg { font-size: 1rem; padding: 0.75rem 1.5rem; }
    }
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
      .pt-tabs { align-self: stretch; }
      .pt-btn.lg { width: 100%; justify-content: center; }
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
        // The QR opens the public pet page when scanned with any phone camera
        const PUBLIC_SITE = window.location.hostname === 'localhost' ? window.location.origin : 'https://petunity-muntinlupacity.com';
        let qrText = pet.public_code ? `${PUBLIC_SITE}/pet/${pet.public_code}` : null;
        if (!qrText) {
          let qrCode = pet.qr_code;
          if (!qrCode && pet.microchip_number) {
            const microchipRes = await microchipAPI.getByPetId(petId);
            qrCode = microchipRes.data.microchip_record?.qr_code;
          }
          if (qrCode) qrText = JSON.stringify(JSON.parse(atob(qrCode)));
        }
        if (qrText) {
            const QRCode = (await import('qrcode')).default;
            const dataURL = await QRCode.toDataURL(qrText, {
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
      setShowRegisterModal(false);
      setUpdateSuccess(`${registerFormData.name} has been registered. Registration no. ${response.data.pet.registration_number}`);
      setTimeout(() => setUpdateSuccess(''), 4000);
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
      <ConfirmModal
        show={showArchiveModal} onHide={() => setShowArchiveModal(false)}
        color="#b07d05" icon="fa-archive" title={`Archive ${selectedPet?.name || 'this pet'}?`}
        text="The pet will be moved to your archived list and will no longer appear in your active pets."
        pet={selectedPet}
        note="All records are kept. You can unarchive this pet anytime."
        confirmLabel="Archive pet" confirmIcon="fa-archive"
        onConfirm={confirmArchivePet} loading={archiveActionLoading}
      />

      {/* ===== UNARCHIVE MODAL ===== */}
      <ConfirmModal
        show={showUnarchiveModal} onHide={() => setShowUnarchiveModal(false)}
        color="#198754" icon="fa-box-open" title={`Unarchive ${selectedPet?.name || 'this pet'}?`}
        text="The pet will be moved back to your active pets."
        pet={selectedPet}
        note="This pet and all its records will be visible again in your active list."
        confirmLabel="Unarchive pet" confirmIcon="fa-box-open"
        onConfirm={confirmUnarchivePet} loading={archiveActionLoading}
      />

      {/* ===== RESTORE MODAL ===== */}
      <ConfirmModal
        show={showRestoreModal} onHide={() => setShowRestoreModal(false)}
        color="#198754" icon="fa-undo" title={`Restore ${selectedPet?.name || 'this pet'}?`}
        text="The pet will be restored back to your active list."
        pet={selectedPet}
        note="This pet and all its records will be fully restored and visible again."
        confirmLabel="Restore pet" confirmIcon="fa-undo"
        onConfirm={confirmRestorePet} loading={restoreLoading}
      />

      {/* ===== FORCE DELETE MODAL ===== */}
      <ConfirmModal
        show={showForceDeleteModal} onHide={() => setShowForceDeleteModal(false)}
        color="#dc3545" icon="fa-trash-alt" title="Delete permanently?"
        text="This cannot be undone. The pet will be removed from the system for good."
        pet={selectedPet}
        note="All records of this pet will be permanently erased."
        confirmLabel="Delete forever" confirmIcon="fa-trash-alt"
        onConfirm={confirmForceDeletePet} loading={forceDeleteLoading}
      />

      {/* Register Pet Modal */}
      <Modal show={showRegisterModal} onHide={() => setShowRegisterModal(false)} backdrop="static" dialogClassName="pm-modal" className="pt-modal" scrollable>
        <Form onSubmit={handleRegisterPet} style={{ display: 'contents' }}>
          <Modal.Header closeButton className="pm-head">
            <div className="pm-head-main">
              <div className="pm-head-ic"><i className="fas fa-paw" /></div>
              <div>
                <div className="pm-kicker">New pet</div>
                <Modal.Title as="h5" className="pm-title">Register a pet</Modal.Title>
                <div className="pm-head-sub">Fields marked <span className="pm-req">*</span> are required.</div>
              </div>
            </div>
          </Modal.Header>

          <Modal.Body className="pm-body">
            {registerError && <div className="pm-alert danger"><i className="fas fa-exclamation-triangle" />{registerError}</div>}
            {registerSuccess && (
              <div className="pm-alert success">
                <i className="fas fa-check-circle" />
                <div><strong>Pet registered successfully!</strong><div>{registerSuccess}</div></div>
              </div>
            )}

            <div className="pm-section">
              <div className="pm-section-title"><i className="fas fa-id-card" />Basic information</div>

              <Form.Group className="mb-3">
                <Form.Label className="pm-label">Pet name <span className="pm-req">*</span></Form.Label>
                <Form.Control className="pm-input" type="text" name="name" value={registerFormData.name}
                  onChange={handleRegisterFormChange} placeholder="e.g. Bantay" required disabled={registerLoading} />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="pm-label">Type of pet <span className="pm-req">*</span></Form.Label>
                <div className="pm-species">
                  {[{ v: 'dog', l: 'Dog', i: 'fa-dog' }, { v: 'cat', l: 'Cat', i: 'fa-cat' }].map(o => (
                    <button key={o.v} type="button" disabled={registerLoading}
                      className={`pm-species-btn${registerFormData.species === o.v ? ' on' : ''}`}
                      onClick={() => handleRegisterFormChange({ target: { name: 'species', value: o.v, type: 'select-one' } })}
                      aria-pressed={registerFormData.species === o.v}>
                      <i className={`fas ${o.i}`} />{o.l}
                      {registerFormData.species === o.v && <i className="fas fa-check-circle pm-species-check" />}
                    </button>
                  ))}
                </div>
                {/* keeps the native "required" check */}
                <input tabIndex={-1} aria-hidden="true" className="pm-hidden-req" value={registerFormData.species} onChange={() => {}} required />
              </Form.Group>

              <Row className="g-3 mb-3">
                <Col md={6}>
                  <Form.Label className="pm-label">Breed</Form.Label>
                  <Form.Select className="pm-input" name="breed" value={registerFormData.breed} onChange={handleRegisterFormChange}
                    disabled={registerLoading || !registerFormData.species}>
                    <option value="">{registerFormData.species ? 'Select breed' : 'Select pet type first'}</option>
                    {getBreedOptions().map(breed => <option key={breed} value={breed}>{breed}</option>)}
                    <option value="mixed">Mixed Breed</option>
                    <option value="unknown">Unknown</option>
                    <option value="other">Other</option>
                  </Form.Select>
                  {registerFormData.breed === 'other' && (
                    <Form.Control className="pm-input mt-2" type="text" name="breed_other" value={registerFormData.breed_other || ''}
                      onChange={handleRegisterFormChange} placeholder="Please specify breed" disabled={registerLoading} />
                  )}
                </Col>
                <Col md={6}>
                  <Form.Label className="pm-label">Gender <span className="pm-req">*</span></Form.Label>
                  <Form.Select className="pm-input" name="gender" value={registerFormData.gender} onChange={handleRegisterFormChange}
                    required disabled={registerLoading || !registerFormData.species}>
                    <option value="">{registerFormData.species ? 'Select gender' : 'Select pet type first'}</option>
                    {getGenderOptions(registerFormData.species).map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={6}>
                  <Form.Label className="pm-label">Birth date</Form.Label>
                  <Form.Control className="pm-input" type="date" name="birth_date" value={registerFormData.birth_date}
                    onChange={handleRegisterFormChange} max={new Date().toISOString().split('T')[0]} disabled={registerLoading} />
                  {registerFormData.birth_date && (
                    <div className="pm-hint ok"><i className="fas fa-birthday-cake" />{calculateAgeForRegistration(registerFormData.birth_date)} old</div>
                  )}
                </Col>
                <Col md={6}>
                  <Form.Label className="pm-label">Weight</Form.Label>
                  <div className="pm-suffix">
                    <Form.Control className="pm-input" type="number" name="weight" value={registerFormData.weight}
                      onChange={handleRegisterFormChange} placeholder="0.00" step="0.01" min="0" disabled={registerLoading} />
                    <span>kg</span>
                  </div>
                </Col>
              </Row>
            </div>

            <div className="pm-section">
              <div className="pm-section-title"><i className="fas fa-heartbeat" />Health</div>
              <label className={`pm-toggle${registerFormData.sterilized ? ' on' : ''}`} htmlFor="sterilized-check">
                <div>
                  <div className="pm-toggle-title">{getSterilizationLabel(registerFormData.gender)}</div>
                  <div className="pm-toggle-sub">Turn on if your pet is already {getSterilizationLabel(registerFormData.gender).toLowerCase()}.</div>
                </div>
                <Form.Check type="switch" id="sterilized-check" name="sterilized" checked={registerFormData.sterilized}
                  onChange={handleRegisterFormChange} disabled={registerLoading} className="pm-switch" />
              </label>
              {registerFormData.sterilized && (
                <Row className="g-3 mt-0">
                  <Col md={6}>
                    <Form.Label className="pm-label">{getSterilizedByLabel(registerFormData.gender)}</Form.Label>
                    <Form.Control className="pm-input" type="text" name="sterilized_by" value={registerFormData.sterilized_by}
                      onChange={handleRegisterFormChange} placeholder="Dr. Juan Dela Cruz" disabled={registerLoading} />
                  </Col>
                  <Col md={6}>
                    <Form.Label className="pm-label">Sterilization date</Form.Label>
                    <Form.Control className="pm-input" type="date" name="sterilization_date" value={registerFormData.sterilization_date}
                      onChange={handleRegisterFormChange} max={new Date().toISOString().split('T')[0]} disabled={registerLoading} />
                  </Col>
                </Row>
              )}
            </div>

            <div className="pm-section mb-0">
              <div className="pm-section-title"><i className="fas fa-notes-medical" />Special notes</div>
              <Form.Control className="pm-input" as="textarea" rows={3} name="special_notes" value={registerFormData.special_notes}
                onChange={handleRegisterFormChange} disabled={registerLoading}
                placeholder="Medical conditions, allergies, behavior, or anything the vet should know…" />
            </div>
          </Modal.Body>

          <Modal.Footer className="pm-foot">
            <button type="button" className="pt-btn ghost lg" onClick={() => setShowRegisterModal(false)} disabled={registerLoading}>Cancel</button>
            <button type="submit" className="pt-btn primary lg" disabled={registerLoading}>
              {registerLoading ? <WaveDots /> : <><i className="fas fa-plus-circle" />Register pet</>}
            </button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Pet Details Modal */}
      <Modal show={showDetailsModal} onHide={() => { setShowDetailsModal(false); setQrDataURL(''); }} dialogClassName="pm-modal lg" className="pt-modal" scrollable>
        {petDetails && (() => {
          const p = petDetails;
          const hasBirth = p.birth_date && p.birth_date !== '0000-00-00';
          const fmt = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          const vax = p.vaccination_history || [];
          const info = [
            { icon: 'fa-dna', label: 'Breed', value: p.breed || 'Mixed' },
            { icon: 'fa-birthday-cake', label: 'Birth date', value: hasBirth ? fmt(p.birth_date) : 'Unknown' },
            { icon: 'fa-hourglass-half', label: 'Age', value: calculateAge(p.birth_date) },
            { icon: 'fa-weight', label: 'Weight', value: p.weight ? `${p.weight} kg` : 'Not specified' },
            { icon: 'fa-microchip', label: 'Microchip no.', value: p.microchip_number || 'Not microchipped', mono: !!p.microchip_number },
          ];
          return (
            <>
              <Modal.Header closeButton className="pm-head hero">
                <div className="pm-head-main">
                  <img className="pm-hero-photo" src={getPetImage(p.species, p.photo_url)} alt={p.name}
                    onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = getPetImage(p.species); }} />
                  <div style={{ minWidth: 0 }}>
                    <Modal.Title as="h5" className="pm-title">{p.name}</Modal.Title>
                    <div className="pm-reg">{p.registration_number}</div>
                    <div className="pm-chips">
                      <span className="pm-chip"><i className={`fas ${p.species === 'cat' ? 'fa-cat' : 'fa-dog'}`} /><span className="text-capitalize">{p.species}</span></span>
                      <span className="pm-chip"><i className={`fas ${p.gender === 'female' ? 'fa-venus' : 'fa-mars'}`} /><span className="text-capitalize">{p.gender}</span></span>
                      {p.sterilized ? <span className="pm-chip ok"><i className="fas fa-check" />{getSterilizationLabel(p.gender)}</span> : null}
                    </div>
                  </div>
                </div>
              </Modal.Header>

              <Modal.Body className="pm-body">
                <Row className="g-4">
                  <Col md={7}>
                    <div className="pm-section-title"><i className="fas fa-info-circle" />Pet information</div>
                    <div className="pm-info-grid">
                      {info.map(it => (
                        <div key={it.label} className="pm-info">
                          <div className="pm-info-ic"><i className={`fas ${it.icon}`} /></div>
                          <div style={{ minWidth: 0 }}>
                            <div className="pm-info-label">{it.label}</div>
                            <div className="pm-info-value" style={it.mono ? { fontFamily: 'ui-monospace, Menlo, Consolas, monospace' } : undefined}>{it.value}</div>
                          </div>
                        </div>
                      ))}
                      <div className="pm-info">
                        <div className="pm-info-ic"><i className="fas fa-cut" /></div>
                        <div style={{ minWidth: 0 }}>
                          <div className="pm-info-label">{getSterilizationLabel(p.gender)}</div>
                          <div className="pm-info-value" style={{ color: p.sterilized ? '#198754' : '#6b7280' }}>
                            {p.sterilized ? 'Yes' : 'No'}
                          </div>
                          {p.sterilized && (p.sterilization_date || p.sterilized_by) ? (
                            <div className="pm-info-extra">
                              {p.sterilization_date && fmt(p.sterilization_date)}
                              {p.sterilization_date && p.sterilized_by && ' · '}
                              {p.sterilized_by}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {p.special_notes && (
                      <div className="pm-notes">
                        <div className="pm-section-title mb-1"><i className="fas fa-notes-medical" />Special notes</div>
                        <p>{p.special_notes}</p>
                      </div>
                    )}

                    <div className="pm-section-title mt-4"><i className="fas fa-syringe" />Vaccination history</div>
                    {vax.length === 0 ? (
                      <div className="pm-empty">
                        <i className="fas fa-syringe" />
                        <div><strong>No vaccination records yet</strong><span>Join a vaccination event to get your pet vaccinated.</span></div>
                      </div>
                    ) : (
                      <div className="pm-vax-list">
                        {vax.slice(0, 5).map(v => {
                          const due = v.next_due_date && new Date(v.next_due_date) < new Date();
                          return (
                            <div key={v.id} className="pm-vax">
                              <div className={`pm-vax-dot${due ? ' due' : ''}`} />
                              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                <div className="d-flex align-items-center justify-content-between gap-2">
                                  <strong className="pm-vax-name">{v.vaccination_name}</strong>
                                  <span className={`pm-pill ${due ? 'warn' : 'ok'}`}>{due ? 'Due' : 'Current'}</span>
                                </div>
                                <div className="pm-vax-meta">
                                  Given {fmt(v.vaccination_date)}
                                  {v.next_due_date && <> · Next {fmt(v.next_due_date)}</>}
                                </div>
                                <div className="pm-vax-meta">
                                  <i className="fas fa-user-md" />{v.veterinarian_name || `${v.first_name || ''} ${v.last_name || ''}`.trim() || '—'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {vax.length > 5 && <div className="pm-more">+{vax.length - 5} more in the vet card</div>}
                      </div>
                    )}
                  </Col>

                  <Col md={5}>
                    <div className="pm-qr-card">
                      <div className="pm-section-title justify-content-center"><i className="fas fa-qrcode" />Pet QR code</div>
                      {qrLoading ? (
                        <div className="pm-qr-skel" />
                      ) : qrDataURL ? (
                        <>
                          <img src={qrDataURL} alt="Pet QR code" className="pm-qr-img" />
                          <div className="pm-qr-code">{p.registration_number}</div>
                          <p className="pm-qr-note">Anyone who scans this code can see your pet's basic profile and contact you.</p>
                          <button type="button" className="pt-btn ghost w-100"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = qrDataURL;
                              link.download = `QR_${p.name}_${p.registration_number}.png`;
                              link.click();
                            }}>
                            <i className="fas fa-download" /> Download QR code
                          </button>
                        </>
                      ) : (
                        <div className="pm-qr-none"><i className="fas fa-qrcode" />QR code not available</div>
                      )}
                    </div>
                  </Col>
                </Row>
              </Modal.Body>

              <Modal.Footer className="pm-foot">
                <button type="button" className="pt-btn ghost lg" onClick={() => { setShowDetailsModal(false); setQrDataURL(''); }}>Close</button>
              </Modal.Footer>
            </>
          );
        })()}
      </Modal>

      {/* Edit Pet Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} dialogClassName="pm-modal" className="pt-modal" scrollable>
        <Form onSubmit={handleUpdatePet} style={{ display: 'contents' }}>
          <Modal.Header closeButton className="pm-head">
            <div className="pm-head-main">
              <div className="pm-head-ic"><i className="fas fa-pen" /></div>
              <div style={{ minWidth: 0 }}>
                <div className="pm-kicker">Edit pet</div>
                <Modal.Title as="h5" className="pm-title">{selectedPet?.name}</Modal.Title>
                {selectedPet && (
                  <div className="pm-head-sub">
                    {selectedPet.registration_number} · <span className="text-capitalize">{selectedPet.species}</span> · <span className="text-capitalize">{selectedPet.gender}</span>
                  </div>
                )}
              </div>
            </div>
          </Modal.Header>

          <Modal.Body className="pm-body">
            {updateError && <div className="pm-alert danger"><i className="fas fa-exclamation-triangle" />{updateError}</div>}
            {updateSuccess && <div className="pm-alert success"><i className="fas fa-check-circle" />{updateSuccess}</div>}

            <div className="pm-section">
              <div className="pm-section-title"><i className="fas fa-id-card" />Basic information</div>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Label className="pm-label">Pet name <span className="pm-req">*</span></Form.Label>
                  <Form.Control className="pm-input" type="text" name="name" value={editFormData.name}
                    onChange={handleEditFormChange} required disabled={updateLoading} />
                </Col>
                <Col md={6}>
                  <Form.Label className="pm-label">Breed</Form.Label>
                  <Form.Control className="pm-input" type="text" name="breed" value={editFormData.breed}
                    onChange={handleEditFormChange} disabled={updateLoading} />
                </Col>
                <Col md={6}>
                  <Form.Label className="pm-label">Birth date</Form.Label>
                  <Form.Control className="pm-input" type="date" name="birth_date" value={editFormData.birth_date}
                    onChange={handleEditFormChange} max={new Date().toISOString().split('T')[0]} disabled={updateLoading} />
                  {editFormData.birth_date && (
                    <div className="pm-hint ok"><i className="fas fa-birthday-cake" />{calculateAgeForRegistration(editFormData.birth_date)} old</div>
                  )}
                </Col>
                <Col md={6}>
                  <Form.Label className="pm-label">Weight</Form.Label>
                  <div className="pm-suffix">
                    <Form.Control className="pm-input" type="number" name="weight" value={editFormData.weight}
                      onChange={handleEditFormChange} step="0.01" min="0" disabled={updateLoading} />
                    <span>kg</span>
                  </div>
                </Col>
              </Row>
            </div>

            <div className="pm-section">
              <div className="pm-section-title"><i className="fas fa-heartbeat" />Health</div>
              <label className={`pm-toggle${editFormData.sterilized ? ' on' : ''}`} htmlFor="sterilized-check-edit">
                <div>
                  <div className="pm-toggle-title">{getSterilizationLabel(selectedPet?.gender)}</div>
                  <div className="pm-toggle-sub">Turn on if your pet is already {getSterilizationLabel(selectedPet?.gender).toLowerCase()}.</div>
                </div>
                <Form.Check type="switch" id="sterilized-check-edit" name="sterilized" checked={editFormData.sterilized || false}
                  onChange={handleEditFormChange} disabled={updateLoading} className="pm-switch" />
              </label>
              {editFormData.sterilized && (
                <Row className="g-3 mt-0">
                  <Col md={6}>
                    <Form.Label className="pm-label">{getSterilizedByLabel(selectedPet?.gender)}</Form.Label>
                    <Form.Control className="pm-input" type="text" name="sterilized_by" value={editFormData.sterilized_by}
                      onChange={handleEditFormChange} placeholder="Dr. Juan Dela Cruz" disabled={updateLoading} />
                  </Col>
                  <Col md={6}>
                    <Form.Label className="pm-label">Sterilization date</Form.Label>
                    <Form.Control className="pm-input" type="date" name="sterilization_date" value={editFormData.sterilization_date}
                      onChange={handleEditFormChange} max={new Date().toISOString().split('T')[0]} disabled={updateLoading} />
                  </Col>
                </Row>
              )}
            </div>

            <div className="pm-section mb-0">
              <div className="pm-section-title"><i className="fas fa-notes-medical" />Special notes</div>
              <Form.Control className="pm-input" as="textarea" rows={3} name="special_notes" value={editFormData.special_notes}
                onChange={handleEditFormChange} disabled={updateLoading}
                placeholder="Medical conditions, allergies, behavior, or anything the vet should know…" />
            </div>
          </Modal.Body>

          <Modal.Footer className="pm-foot">
            <span className="pm-foot-note">{!hasEditChanges && !updateLoading ? 'No changes yet' : ''}</span>
            <div className="pm-foot-btns">
              <button type="button" className="pt-btn ghost lg" onClick={() => setShowEditModal(false)} disabled={updateLoading}>Cancel</button>
              <button type="submit" className="pt-btn primary lg" disabled={updateLoading || !hasEditChanges}>
                {updateLoading ? <WaveDots /> : <><i className="fas fa-save" />Save changes</>}
              </button>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        show={showDeleteModal} onHide={() => setShowDeleteModal(false)}
        color="#dc3545" icon="fa-trash" title={`Remove ${selectedPet?.name || 'this pet'}?`}
        text="The pet will be removed from your registered pets."
        pet={selectedPet}
        note="The pet will be deactivated, but its records stay in the system for history."
        confirmLabel="Remove pet" confirmIcon="fa-trash"
        onConfirm={confirmDeletePet} loading={deleteLoading}
      />
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