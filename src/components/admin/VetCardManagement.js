import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Modal, Table, Form, InputGroup } from 'react-bootstrap';
import { vetCardAPI, petAPI, handleAPIError } from '../../services/api';
import { getUser } from '../../utils/auth';

const VetCardManagement = () => {
  const [vetCards, setVetCards] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

// Pagination
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 10;

const [searchTerm, setSearchTerm] = useState('');
const [filterSpecies, setFilterSpecies] = useState('all');
  
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
  .vc-management-page {
  zoom: 0.75;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
@media (min-width: 1600px) { .vc-management-page { zoom: 0.9; } }
@media (min-width: 1920px) { .vc-management-page { zoom: 1; } }

@media (max-width: 768px) {
      .vc-title { font-size: 1.5rem !important; }
      .vc-stat-label { font-size: 0.55rem !important; margin-bottom: 0.15rem !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; }
      .vc-stat-number { font-size: 1.1rem !important; margin-bottom: 0.25rem !important; }
      .vc-stat-description { display: none !important; }
      .vc-stat-card-body { padding: 0.6rem 0.5rem !important; }
      .vc-stat-icon { width: 32px !important; height: 32px !important; border-radius: 8px !important; flex-shrink: 0 !important; }
      .vc-stat-icon img { width: 18px !important; height: 18px !important; }
      .vc-card-header { padding: 0.75rem 1rem !important; }
      .vc-card-header h5 { font-size: 0.85rem !important; }
      .vc-card-body { padding: 1rem !important; }
      .vc-table th, .vc-table td { font-size: 0.7rem !important; padding: 0.4rem 0.25rem !important; }
.vc-table tr.empty-row td { padding: 0 !important; }
      .vc-table .mobile-hide { display: none !important; }
      .vc-table .pet-img { width: 28px !important; height: 28px !important; }
      .vc-pagination { font-size: 0.75rem !important; }
      .vc-pagination .page-btn { padding: 0.35rem 0.55rem !important; min-width: 32px !important; font-size: 0.75rem !important; }
      .vc-pagination .page-info { font-size: 0.75rem !important; }
    }

    /* ---------------- Vet Card Management ---------------- */
    @keyframes vmIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes vmRow { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes vmMenu { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes vmToast { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
    @keyframes vmGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    .vm-anim { animation: vmIn 0.45s ease-out backwards; animation-delay: var(--d, 0s); }
    .vm-title { font-weight: 700; color: #1f2328; font-size: 1.85rem; margin: 0; }
    .vm-sub { color: #6b7280; font-size: 0.95rem; margin: 0.15rem 0 0; }

    .vm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; border-radius: 10px; border: 1px solid transparent; font-weight: 600; font-size: 0.86rem; padding: 0.5rem 0.95rem; white-space: nowrap; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
    .vm-btn.lg { padding: 0.7rem 1.25rem; font-size: 0.92rem; }
    .vm-btn.primary { background: #ffc107; color: #1f2328; }
    .vm-btn.primary:hover { background: #f0b400; box-shadow: 0 6px 16px rgba(255,193,7,0.35); transform: translateY(-1px); }

    .vm-toast { position: fixed; top: 84px; left: 50%; transform: translateX(-50%); z-index: 99999; min-width: 320px; max-width: 480px; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: #fff; border: 1px solid #e9ecef; border-left: 4px solid #198754; border-radius: 12px; box-shadow: 0 16px 40px rgba(16,24,40,0.16); animation: vmToast 0.35s ease-out; }
    .vm-toast .ic { width: 34px; height: 34px; border-radius: 50%; background: rgba(25,135,84,0.12); color: #198754; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .vm-toast .t { font-weight: 700; color: #1f2328; font-size: 0.92rem; }
    .vm-toast .d { color: #6b7280; font-size: 0.84rem; }
    .vm-toast-close { border: none; background: transparent; color: #9ca3af; width: 28px; height: 28px; border-radius: 7px; }
    .vm-toast-close:hover { background: #f3f4f6; color: #1f2328; }

    .vm-panel { background: #fff; border: 1px solid #e9ecef; border-radius: 14px; box-shadow: 0 1px 3px rgba(16,24,40,0.04); overflow: hidden; }
    .vm-panel-head { display: flex; align-items: center; gap: 0.75rem; padding: 0.95rem 1.1rem; border-bottom: 1px solid #eef0f3; }
    .vm-head-ic { width: 36px; height: 36px; border-radius: 10px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; }
    .vm-panel-title { font-weight: 700; color: #1f2328; font-size: 0.95rem; }
    .vm-panel-sub { font-size: 0.76rem; color: #6b7280; }

    .vm-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; padding: 1rem 1.25rem 0.75rem; }
    .vm-toolbar-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1.02rem; color: #1f2328; }
    .vm-count { font-size: 0.75rem; font-weight: 700; padding: 0.1rem 0.55rem; border-radius: 999px; background: #1f2328; color: #fff; }
    .vm-seg { display: inline-flex; padding: 3px; border-radius: 10px; background: #f3f4f6; }
    .vm-seg button { border: none; background: transparent; padding: 0.35rem 0.85rem; border-radius: 8px; font-size: 0.82rem; font-weight: 600; color: #5b6270; transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
    .vm-seg button:hover { color: #1f2328; }
    .vm-seg button.on { background: #fff; color: #1f2328; box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
    .vm-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0 1.25rem 1rem; border-bottom: 1px solid #eef0f3; }
    .vm-search, .vm-select { position: relative; }
    .vm-search { flex: 1 1 260px; }
    .vm-search > i, .vm-select > i { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 0.78rem; pointer-events: none; }
    .vm-input { width: 100%; height: 38px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; padding: 0 0.85rem 0 2.1rem; font-size: 0.86rem; color: #1f2328; outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .vm-input:focus { border-color: #e0a800; box-shadow: 0 0 0 3px rgba(255,193,7,0.2); }
    select.vm-input { width: auto; min-width: 170px; padding-right: 2rem; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 0.7rem center; background-size: 12px; }
    .vm-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 26px; height: 26px; border: none; border-radius: 7px; background: transparent; color: #9ca3af; }
    .vm-clear:hover { background: #f3f4f6; color: #1f2328; }
    .vm-link { border: none; background: none; padding: 0 0.25rem; color: #0d6efd; font-size: 0.82rem; font-weight: 600; }
    .vm-link:hover { text-decoration: underline; }

    .vm-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .vm-table th { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; padding: 0.85rem 0.65rem 0.6rem; border-bottom: 1px solid #eef0f3; white-space: nowrap; text-align: left; }
    .vm-table td { padding: 0.8rem 0.65rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; font-size: 0.86rem; color: #1f2328; }
    .vm-table tbody tr { animation: vmRow 0.35s ease-out backwards; transition: background 0.15s ease; }
    .vm-table tbody tr:hover { background: #fafbfc; }
    .vm-table tbody tr:last-child td { border-bottom: none; }
    .vm-table tbody tr.raised { position: relative; z-index: 5; }
    .vm-strong { font-weight: 600; color: #1f2328; }
    .vm-muted { font-size: 0.78rem; color: #6b7280; }
    .vm-ellipsis { max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .vm-date { width: 48px; flex-shrink: 0; border-radius: 10px; background: color-mix(in srgb, var(--c) 10%, #fff); text-align: center; padding: 0.35rem 0; line-height: 1.1; }
    .vm-date .m { display: block; font-size: 0.62rem; font-weight: 700; color: var(--c); text-transform: uppercase; letter-spacing: 0.06em; }
    .vm-date .d { display: block; font-size: 1.2rem; font-weight: 800; color: #1f2328; }
    .vm-type-ic { width: 34px; height: 34px; border-radius: 9px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0; }
    .vm-bar { height: 5px; border-radius: 3px; background: #eef0f3; margin-top: 0.35rem; overflow: hidden; max-width: 130px; }
    .vm-bar > div { height: 100%; border-radius: 3px; transform-origin: left; animation: vmGrow 0.9s cubic-bezier(0.22,1,0.36,1) backwards 0.2s; }
    .vm-pill { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.74rem; font-weight: 700; padding: 0.22rem 0.65rem; border-radius: 999px; white-space: nowrap; }
    .vm-pill i { font-size: 0.4rem; }

    .vm-icon-btn { width: 34px; height: 34px; border-radius: 9px; border: 1px solid transparent; background: transparent; color: #6b7280; display: inline-flex; align-items: center; justify-content: center; transition: background 0.15s ease, border-color 0.15s ease; }
    .vm-icon-btn:hover, .vm-icon-btn.on { background: #f3f4f6; border-color: #e5e7eb; color: #1f2328; }
    .vm-menu { position: absolute; top: calc(100% + 4px); right: 0; min-width: 200px; background: #fff; border: 1px solid #e9ecef; border-radius: 12px; box-shadow: 0 16px 36px rgba(16,24,40,0.14); padding: 0.35rem; z-index: 1050; animation: vmMenu 0.16s ease-out; transform-origin: top right; text-align: left; }
    .vm-menu-item { display: flex; align-items: center; gap: 0.65rem; width: 100%; padding: 0.55rem 0.7rem; border: none; border-radius: 8px; background: transparent; color: #1f2328; font-size: 0.86rem; font-weight: 500; text-align: left; white-space: nowrap; }
    .vm-menu-item i { width: 16px; text-align: center; color: #6b7280; font-size: 0.82rem; }
    .vm-menu-item:hover { background: #f6f7f9; }
    .vm-menu-item.danger, .vm-menu-item.danger i { color: #dc3545; }
    .vm-menu-item.danger:hover { background: #fff5f5; }
    .vm-menu-sep { height: 1px; background: #f0f1f3; margin: 0.3rem 0.2rem; }

    .vm-empty { text-align: center; padding: 3rem 1rem; }
    .vm-empty .ic { width: 62px; height: 62px; border-radius: 16px; margin: 0 auto 0.9rem; background: rgba(255,193,7,0.14); color: #e0a800; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .vm-empty h6 { font-weight: 700; color: #1f2328; margin-bottom: 0.25rem; }
    .vm-empty p { color: #6b7280; font-size: 0.88rem; margin-bottom: 1rem; }
    .vm-skel { border-radius: 8px; background: linear-gradient(90deg, #f3f4f6 25%, #e9ebee 37%, #f3f4f6 63%); background-size: 400% 100%; animation: shimmer 1.4s ease-in-out infinite; }

    .vm-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; padding: 0.85rem 1.25rem; border-top: 1px solid #eef0f3; }
    .vm-page { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 36px; padding: 0 0.6rem; border-radius: 9px; border: 1px solid transparent; background: transparent; font-size: 0.85rem; font-weight: 600; color: #4b5563; transition: background 0.15s ease; }
    .vm-page:hover:not(:disabled) { background: #f3f4f6; }
    .vm-page.on { background: #ffc107; color: #1f2328; }
    .vm-page.nav { border-color: #e5e7eb; background: #fff; font-size: 0.75rem; }
    .vm-page:disabled { opacity: 0.4; cursor: not-allowed; }

    .vm-btn:focus-visible, .vm-seg button:focus-visible, .vm-icon-btn:focus-visible, .vm-menu-item:focus-visible, .vm-page:focus-visible, .vm-link:focus-visible, .vm-clear:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    @media (max-width: 768px) {
      .vm-title { font-size: 1.45rem; }
      .vm-sub { font-size: 0.85rem; }
      .vm-filters select.vm-input { min-width: 0; width: 100%; }
      .vm-select { flex: 1 1 140px; }
      .vm-ellipsis { max-width: 160px; }
      .vm-toast { min-width: 0; width: calc(100% - 2rem); top: 76px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .vm-anim, .vm-table tbody tr, .vm-menu, .vm-toast, .vm-bar > div, .vm-skel { animation: none !important; }
    }
    .vm-toolbar { border-bottom: 1px solid #eef0f3; }
    .vm-filters { padding-top: 1rem; }
    .vm-table { table-layout: fixed; }
    .vm-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .vm-face { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,193,7,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .vm-face img { width: 28px; height: 28px; object-fit: contain; }
    .vm-gender { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.84rem; font-weight: 500; }
    .vm-gender.male i { color: #0d6efd; }
    .vm-gender.female i { color: #d63384; }
    .vm-num { display: inline-flex; align-items: center; gap: 0.4rem; font-weight: 700; color: #9ca3af; }
    .vm-num i { font-size: 0.75rem; }
    .vm-num.has { color: #1f2328; }
    .vm-num.has i { color: var(--c); }
    .vm-btn.ghost { background: #fff; color: #1f2328; border: 1px solid #e5e7eb; padding: 0.4rem 0.8rem; font-size: 0.8rem; }
    .vm-btn.ghost:hover { background: #fff8e1; border-color: #ffc107; }
    @media (max-width: 768px) {
      .vm-table { table-layout: auto; }
      .vm-table th { width: auto !important; }
    }
  `;
  
  const [displayCounts, setDisplayCounts] = useState({ totalVetCards: 0, withoutCards: 0, coverage: 0 });
const [hasAnimated, setHasAnimated] = useState(false);

const user = getUser();

  useEffect(() => {
    loadData();
  }, []);

const CACHE_KEY = '__vetcards__';
const CACHE_TTL = 60_000;

const loadData = async (bustCache = false) => {
  if (!bustCache) {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const { ts, vetCards, pets } = JSON.parse(raw);
        if (Date.now() - ts < CACHE_TTL) {
          setVetCards(vetCards);
          setPets(pets);
          setLoading(false);
          return;
        }
      }
    } catch {}
  }

  try {
    setLoading(true);
    const [vetCardsRes, petsRes] = await Promise.all([
      vetCardAPI.getAll(),
      petAPI.getAllUnpaginated()
    ]);
    const newVetCards = vetCardsRes.data.vet_cards || [];
    const newPets     = petsRes.data.pets || [];
    setVetCards(newVetCards);
    setPets(newPets);
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({
        ts: Date.now(), vetCards: newVetCards, pets: newPets
      }));
    } catch {}
  } catch (err) {
    const { message } = handleAPIError(err);
    setError(message);
  } finally {
    setLoading(false);
  }
};

  const handleViewVetCard = (petId) => {
    window.open(`/vet-card-view/${petId}`, '_blank');
  };

  const getPetDetails = (petId) => {
    return pets.find(p => p.id === petId);
  };

  const hasActiveVetCard = (petId) => {
    // Check pets array first (from pets endpoint with has_vet_card field)
    const pet = pets.find(p => p.id === petId);
    if (pet && pet.has_vet_card !== undefined) {
      return pet.has_vet_card == 1 || pet.has_vet_card === true;
    }
    // Fallback to vetCards array
    return vetCards.some(card => 
      card.pet_id === petId && 
      (card.is_active === 1 || card.is_active === '1' || card.is_active === true)
    );
  };

  const getPetFaceImage = (species) => {
    if (species?.toLowerCase() === 'dog') {
      return '/dog_face.png';
    } else if (species?.toLowerCase() === 'cat') {
      return '/cat_face.png';
    }
    return '/dog_face.png';
  };

  const petsWithCards = pets.filter(pet => {
  if (!hasActiveVetCard(pet.id)) return false;

  const matchesSearch =
    (pet.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (pet.registration_number || '').toLowerCase().includes(searchTerm.toLowerCase());

  const matchesSpecies =
    filterSpecies === 'all' || pet.species === filterSpecies;

  return matchesSearch && matchesSpecies;
});
  const petsWithoutCards = pets.filter(pet => !hasActiveVetCard(pet.id) && (pet.is_active === 1 || pet.is_active === '1' || pet.is_active === true));

  const totalPets = pets.length;
  const totalVetCards = petsWithCards.length;
  const averagePercentage = totalPets > 0 ? ((totalVetCards / totalPets) * 100).toFixed(0) : 0;

  useEffect(() => {
  if (loading || hasAnimated) return;
  const targets = {
    totalVetCards: parseInt(totalVetCards) || 0,
    withoutCards: petsWithoutCards.length || 0,
    coverage: parseInt(averagePercentage) || 0,
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
      totalVetCards: step >= steps ? targets.totalVetCards : Math.round(t * targets.totalVetCards),
      withoutCards:  step >= steps ? targets.withoutCards  : Math.round(t * targets.withoutCards),
      coverage:      step >= steps ? targets.coverage      : Math.round(t * targets.coverage),
    });
    if (step >= steps) clearInterval(timer);
  }, duration / steps);
  return () => clearInterval(timer);
}, [loading, totalVetCards, petsWithoutCards.length, averagePercentage]);

  // Pagination calculations
const totalPages = Math.ceil(petsWithCards.length / itemsPerPage);
const startIdx = (currentPage - 1) * itemsPerPage;
const endIdx = startIdx + itemsPerPage;
const paginatedPetsWithCards = petsWithCards.slice(startIdx, endIdx);
const emptyRows = itemsPerPage - paginatedPetsWithCards.length;

  

  const vmPagerNumbers = (() => {
    const pages = [];
    let start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  })();
  const hasVcFilters = searchTerm || filterSpecies !== 'all';

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4 vc-management-page" style={{ backgroundColor: '#ffffff', transition: 'all 0.3s ease' }}>

        {/* Header */}
        <div className="mb-4 vm-anim">
          <h2 className="vm-title vc-title">Vet Card Management</h2>
          <p className="vm-sub">Pets with an issued vet card and their health record counts.</p>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius: '12px' }}>
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess('')} style={{ borderRadius: '12px' }}>
            <i className="fas fa-check-circle me-2"></i>
            {success}
          </Alert>
        )}
      {/* Statistics Cards */}
      <Row className="mb-4" style={{ display: 'flex', flexWrap: 'nowrap', margin: '0 -6px' }}>
        {[
          {
            label: 'Total Vet Cards',
            count: displayCounts.totalVetCards,
            img: '/vetcard.png',
            accent: '#ffc107',
            accentAlpha: 'rgba(255,193,7,0.12)',
            fallbackIcon: 'fa-id-card',
            description: 'Issued Vet Cards',
            delay: '0.1s'
          },
          {
            label: 'Without Vet Cards',
            count: displayCounts.withoutCards,
            img: '/without_vetcard.png',
            accent: '#0dcaf0',
            accentAlpha: 'rgba(13,202,240,0.12)',
            fallbackIcon: 'fa-times-circle',
            description: 'Pets Pending Cards',
            delay: '0.2s'
          },
          {
            label: 'Coverage',
            count: `${displayCounts.coverage}%`,
            img: '/average.png',
            accent: '#198754',
            accentAlpha: 'rgba(25,135,84,0.12)',
            fallbackIcon: 'fa-chart-pie',
            description: 'Pets with Vet Cards',
            delay: '0.3s'
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
              <Card.Body className="vc-stat-card-body" style={{ padding: '1.5rem', background: 'transparent' }}>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="vc-stat-label" style={{
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#999999',
                      marginBottom: '0.5rem'
                    }}>
                      {label}
                    </p>
                    <h2 className="vc-stat-number" style={{
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
                    <div className="vc-stat-description" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                  <div className="vc-stat-icon" style={{
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

      {/* Pets with vet cards */}
      <div className="vm-panel vm-anim" style={{ '--d': '0.18s' }}>
        <div className="vm-toolbar">
          <div className="vm-toolbar-title">
            <span>Pets with vet cards</span>
            <span className="vm-count">{petsWithCards.length}</span>
          </div>
        </div>

        <div className="vm-filters">
          <div className="vm-search">
            <i className="fas fa-search" />
            <input
              className="vm-input"
              placeholder="Search by pet name or registration number..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              aria-label="Search pets"
            />
            {searchTerm && (
              <button type="button" className="vm-clear" onClick={() => { setSearchTerm(''); setCurrentPage(1); }} aria-label="Clear search">
                <i className="fas fa-times" />
              </button>
            )}
          </div>
          <div className="vm-select">
            <i className="fas fa-paw" />
            <select className="vm-input" value={filterSpecies} onChange={(e) => { setFilterSpecies(e.target.value); setCurrentPage(1); }} aria-label="Species">
              <option value="all">All species</option>
              <option value="dog">Dogs</option>
              <option value="cat">Cats</option>
            </select>
          </div>
          {hasVcFilters && (
            <button type="button" className="vm-link" onClick={() => { setSearchTerm(''); setFilterSpecies('all'); setCurrentPage(1); }}>
              <i className="fas fa-undo me-1" />Clear filters
            </button>
          )}
        </div>

        <div className="vc-card-body" style={{ padding: '0 1.25rem 0.5rem' }}>
          {loading ? (
            <div style={{ padding: '0.5rem 0 1rem' }}>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="d-flex align-items-center gap-3" style={{ padding: '0.85rem 0', borderBottom: '1px solid #f3f4f6', opacity: 1 - i * 0.12 }}>
                  <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%' }} />
                  <div className="flex-grow-1">
                    <div className="skeleton" style={{ width: '25%', height: 13, marginBottom: 8 }} />
                    <div className="skeleton" style={{ width: '15%', height: 10 }} />
                  </div>
                  <div className="skeleton" style={{ width: 140, height: 12 }} />
                  <div className="skeleton" style={{ width: 90, height: 30, borderRadius: 9 }} />
                </div>
              ))}
            </div>
          ) : petsWithCards.length === 0 ? (
            <div className="vm-empty">
              <div className="ic"><i className="fas fa-id-card" /></div>
              <h6>No vet cards found</h6>
              <p>{hasVcFilters ? 'Try changing or clearing the filters.' : 'Pets with an issued vet card will show here.'}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="vm-table vc-table">
                <thead>
                  <tr>
                    <th style={{ width: '28%' }}>Pet</th>
                    <th style={{ width: '18%' }}>Species / breed</th>
                    <th className="mobile-hide" style={{ width: '13%' }}>Gender</th>
                    <th className="mobile-hide" style={{ width: '14%' }}>Vaccinations</th>
                    <th className="mobile-hide" style={{ width: '14%' }}>Dewormings</th>
                    <th style={{ width: '13%' }} aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {paginatedPetsWithCards.map((pet, i) => (
                    <tr key={pet.id} style={{ animationDelay: `${i * 0.04}s` }}>
                      <td>
                        <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                          <div className="vm-face">
                            <img
                              src={getPetFaceImage(pet.species)}
                              alt=""
                              className="pet-img"
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                            />
                            <i className="fas fa-paw" style={{ display: 'none', color: '#e0a800' }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div className="vm-strong vm-ellipsis" title={pet.name}>{pet.name}</div>
                            <div className="vm-muted vm-mono vm-ellipsis">{pet.registration_number || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="vm-strong text-capitalize" style={{ fontSize: '0.85rem' }}>{pet.species}</div>
                        <div className="vm-muted vm-ellipsis">{pet.breed || 'Mixed'}</div>
                      </td>
                      <td className="mobile-hide">
                        {pet.gender === 'male'
                          ? <span className="vm-gender male"><i className="fas fa-mars" />Male</span>
                          : <span className="vm-gender female"><i className="fas fa-venus" />Female</span>}
                      </td>
                      <td className="mobile-hide">
                        <span className={`vm-num${pet.vaccination_count > 0 ? ' has' : ''}`} style={{ '--c': '#e0a800' }}>
                          <i className="fas fa-syringe" />{pet.vaccination_count || 0}
                        </span>
                      </td>
                      <td className="mobile-hide">
                        <span className={`vm-num${pet.deworming_count > 0 ? ' has' : ''}`} style={{ '--c': '#0d6efd' }}>
                          <i className="fas fa-pills" />{pet.deworming_count || 0}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button type="button" className="vm-btn ghost" onClick={() => handleViewVetCard(pet.id)} title="Opens in a new tab">
                          <i className="fas fa-id-card" />View card
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {petsWithCards.length > itemsPerPage && (
          <div className="vm-foot vc-pagination">
            <span className="vm-muted page-info" style={{ fontSize: '0.84rem' }}>
              Showing <strong style={{ color: '#1f2328' }}>{startIdx + 1}–{Math.min(endIdx, petsWithCards.length)}</strong> of {petsWithCards.length}
            </span>
            <div className="d-flex align-items-center gap-1">
              <button type="button" className="vm-page nav page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} aria-label="Previous page">
                <i className="fas fa-chevron-left" />
              </button>
              {vmPagerNumbers.map(n => (
                <button key={n} type="button" className={`vm-page page-btn${n === currentPage ? ' on' : ''}`} onClick={() => setCurrentPage(n)} aria-current={n === currentPage ? 'page' : undefined}>{n}</button>
              ))}
              <button type="button" className="vm-page nav page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} aria-label="Next page">
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Container>
    </>
  );
};

export default VetCardManagement;