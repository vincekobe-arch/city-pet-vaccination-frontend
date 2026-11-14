import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Table, Modal, Form, InputGroup } from 'react-bootstrap';
import { petAPI, ownerAPI, microchipAPI, handleAPIError } from '../../services/api';

const AnimatedStatValue = ({ value, loading, darkMode }) => {
  const [displayValue, setDisplayValue] = React.useState(0);
  const hasAnimatedRef = React.useRef(false);

  React.useEffect(() => {
    if (loading || hasAnimatedRef.current || value === 0) return;
    hasAnimatedRef.current = true;
    const duration = 1200;
    const steps = 40;
    const increment = value / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const current = step >= steps ? value : Math.round(increment * step);
      setDisplayValue(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [loading, value]);

  if (loading) {
    return (
      <span style={{
        display: 'inline-block', width: '2.2ch', height: '1em',
        borderRadius: '6px',
        background: darkMode
          ? 'linear-gradient(90deg, #2a2a2a 25%, #333 50%, #2a2a2a 75%)'
          : 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '800px 100%',
        animation: 'shimmer 1.4s ease-in-out infinite',
        verticalAlign: 'middle'
      }} />
    );
  }
  return displayValue;
};

const SuperPetManagement = ({ darkMode }) => {
  const [pets, setPets] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [totalPets, setTotalPets] = useState(0);
  const [pageCache, setPageCache] = useState({});
  const [stats, setStats] = useState({ total: 0, dogs: 0, cats: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const [qrDataURL, setQrDataURL] = useState('');
  const [qrLoading, setQrLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('all');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showDropdown, setShowDropdown] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(totalPets / itemsPerPage));


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
    @keyframes shimmer {
      0%   { background-position: -400px 0; }
      100% { background-position: 400px 0; }
    }
    @keyframes fadeInUp {
      0%   { opacity: 0; transform: translateY(20px); }
      100% { opacity: 1; transform: translateY(0); }
    }
    .skeleton {
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 800px 100%;
      animation: shimmer 1.4s ease-in-out infinite;
      border-radius: 8px;
    }
    .skeleton-dark {
      background: linear-gradient(90deg, #2a2a2a 25%, #333 50%, #2a2a2a 75%);
      background-size: 800px 100%;
      animation: shimmer 1.4s ease-in-out infinite;
      border-radius: 8px;
    }
    @media (max-width: 768px) {
      .mobile-title { font-size: 1.5rem !important; }
      .mobile-stat-label { font-size: 0.6rem !important; margin-bottom: 0.25rem !important; }
      .mobile-stat-number { font-size: 1.4rem !important; }
      .mobile-stat-description { display: none !important; }
      .mobile-card-padding { padding: 0.5rem 0.3rem !important; }
      .mobile-card-header { padding: 0.75rem 1rem !important; }
      .mobile-card-header h5 { font-size: 0.85rem !important; }
      .mobile-card-body { padding: 1rem !important; }
      .mobile-table-wrap th, .mobile-table-wrap td { font-size: 0.7rem !important; padding: 0.4rem 0.25rem !important; }
      .mobile-table-wrap .mobile-hide { display: none !important; }
      .mobile-table-img { width: 28px !important; height: 28px !important; }
      .mobile-table-badge { font-size: 0.65rem !important; padding: 0.25rem 0.4rem !important; }
      .mobile-pagination { font-size: 0.75rem !important; }
      .mobile-pagination .page-btn { padding: 0.35rem 0.55rem !important; min-width: 32px !important; font-size: 0.75rem !important; }
      .mobile-pagination .page-info { font-size: 0.75rem !important; }
      .mobile-filter-stack { flex-direction: column !important; gap: 0.5rem !important; }
      .mobile-filter-stack > div { width: 100% !important; }
      .mobile-stat-icon { width: 36px !important; height: 36px !important; border-radius: 8px !important; }
      .mobile-stat-icon img { width: 20px !important; height: 20px !important; }
      .pet-modal .modal-body { padding: 0.75rem !important; }
      .pet-modal .card { margin-bottom: 0.75rem !important; }
      .pet-modal .card-header { padding: 0.6rem 0.75rem !important; }
      .pet-modal .card-header h6 { font-size: 0.82rem !important; }
      .pet-modal .card-body { padding: 0.6rem 0.75rem !important; }
      .pet-modal .card-body td { font-size: 0.75rem !important; padding: 0.3rem 0.25rem !important; word-break: break-word; }
      .pet-modal .card-body td:first-child { width: 100px !important; min-width: 100px !important; }
      .pet-modal .modal-footer { padding: 0.6rem 0.75rem !important; }
      .pet-modal .modal-title { font-size: 0.9rem !important; }
      .pet-modal code { font-size: 0.7rem !important; padding: 0.15rem 0.35rem !important; word-break: break-all; }
      .pet-modal .badge { font-size: 0.7rem !important; padding: 0.25rem 0.5rem !important; }
    }
    ${darkMode ? `
      .pet-table td,
      .pet-table tr,
      .pet-table tbody {
        background-color: #141414 !important;
        color: #f0f0f0;
        border-color: #2a2a2a !important;
      }
      .pet-table thead th {
        background-color: #1e1e1e !important;
        border-color: #2a2a2a !important;
      }
      .pet-modal-table td,
      .pet-modal-table tr,
      .pet-modal-table tbody {
        background-color: #1e1e1e !important;
        color: #f0f0f0 !important;
        border-color: #2a2a2a !important;
      }
      .pet-modal .modal-content {
        background-color: #141414 !important;
        border-color: #333333 !important;
      }
      .pet-modal .modal-header {
        background-color: #1a1a1a !important;
        border-color: #333333 !important;
      }
      .pet-modal .modal-body {
        background-color: #141414 !important;
      }
      .pet-modal .modal-footer {
        background-color: #1a1a1a !important;
        border-color: #333333 !important;
      }
      .pet-modal .card {
        background-color: #1e1e1e !important;
        border-color: #333333 !important;
      }
      .pet-modal .card-header {
        background-color: #2a2a2a !important;
        border-color: #333333 !important;
      }
      .pet-modal .card-body {
        background-color: #1e1e1e !important;
      }
      .pet-modal .btn-close {
        filter: invert(1);
      }
    ` : `
      .pet-table td,
      .pet-table tr,
      .pet-table tbody {
        background-color: #ffffff !important;
        border-color: #dee2e6 !important;
      }
      .pet-table thead th {
        background-color: #f8f9fa !important;
      }
    `}
  /* ---------------- Pet Management ---------------- */
  .spm-wrap {
    ${darkMode ? `
    --pm-panel: #141414; --pm-line: #262626; --pm-line2: #1f1f1f; --pm-text: #f0f0f0; --pm-muted: #9a9a9a; --pm-faint: #6b6b6b;
    --pm-soft: #1e1e1e; --pm-hover: #1b1b1b; --pm-input: #1a1a1a; --pm-menu: #1e1e1e;` : `
    --pm-panel: #ffffff; --pm-line: #eef0f3; --pm-line2: #f3f4f6; --pm-text: #1f2328; --pm-muted: #6b7280; --pm-faint: #9ca3af;
    --pm-soft: #f3f4f6; --pm-hover: #fafbfc; --pm-input: #ffffff; --pm-menu: #ffffff;`}
  }
  @keyframes pmIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pmRow { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes pmMenu { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .pm-anim { animation: pmIn 0.45s ease-out backwards; animation-delay: var(--d, 0s); }
  .pm-title { font-weight: 700; color: var(--pm-text); font-size: 1.85rem; margin: 0; }
  .pm-sub { color: var(--pm-muted); font-size: 0.95rem; margin: 0.15rem 0 0; }

  .pm-panel { background: var(--pm-panel); border: 1px solid var(--pm-line); border-radius: 14px; box-shadow: 0 1px 3px rgba(16,24,40,0.04); }
  .pm-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--pm-line); }
  .pm-toolbar-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1.02rem; color: var(--pm-text); }
  .pm-count { font-size: 0.75rem; font-weight: 700; padding: 0.1rem 0.55rem; border-radius: 999px; background: var(--pm-text); color: var(--pm-panel); }
  .pm-seg { display: inline-flex; padding: 3px; border-radius: 10px; background: var(--pm-soft); }
  .pm-seg button { border: none; background: transparent; padding: 0.35rem 0.85rem; border-radius: 8px; font-size: 0.82rem; font-weight: 600; color: var(--pm-muted); transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
  .pm-seg button:hover { color: var(--pm-text); }
  .pm-seg button.on { background: var(--pm-panel); color: var(--pm-text); box-shadow: 0 1px 3px rgba(16,24,40,0.12); }

  .pm-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 1rem 1.25rem; border-bottom: 1px solid var(--pm-line); }
  .pm-search, .pm-select { position: relative; }
  .pm-search { flex: 1 1 260px; }
  .pm-search > i, .pm-select > i { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: var(--pm-faint); font-size: 0.78rem; pointer-events: none; }
  .pm-input { width: 100%; height: 38px; border: 1px solid var(--pm-line); border-radius: 10px; background: var(--pm-input); padding: 0 0.85rem 0 2.1rem; font-size: 0.86rem; color: var(--pm-text); outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
  .pm-input::placeholder { color: var(--pm-faint); }
  .pm-input:focus { border-color: #e0a800; box-shadow: 0 0 0 3px rgba(255,193,7,0.2); }
  select.pm-input { width: auto; min-width: 170px; padding-right: 2rem; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 0.7rem center; background-size: 12px; }
  .pm-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 26px; height: 26px; border: none; border-radius: 7px; background: transparent; color: var(--pm-faint); }
  .pm-clear:hover { background: var(--pm-soft); color: var(--pm-text); }
  .pm-link { border: none; background: none; padding: 0 0.25rem; color: #0d6efd; font-size: 0.82rem; font-weight: 600; }
  .pm-link:hover { text-decoration: underline; }

  .pm-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
  .pm-table th { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pm-faint); padding: 0.85rem 0.65rem 0.6rem; border-bottom: 1px solid var(--pm-line); white-space: nowrap; text-align: left; background: transparent; }
  .pm-table td { padding: 0.75rem 0.65rem; border-bottom: 1px solid var(--pm-line2); vertical-align: middle; font-size: 0.86rem; color: var(--pm-text); background: transparent; }
  .pm-table tbody tr { animation: pmRow 0.35s ease-out backwards; transition: background 0.15s ease; }
  .pm-table tbody tr:hover { background: var(--pm-hover); }
  .pm-table tbody tr:last-child td { border-bottom: none; }
  .pm-table tbody tr.raised { position: relative; z-index: 5; }
  .pm-strong { font-weight: 600; color: var(--pm-text); }
  .pm-muted { font-size: 0.78rem; color: var(--pm-muted); }
  .pm-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
  .pm-ellipsis { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pm-face { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,193,7,0.12); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .pm-face img { width: 28px; height: 28px; object-fit: contain; }
  .pm-gender { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.84rem; font-weight: 500; }
  .pm-gender.male i { color: #0d6efd; }
  .pm-gender.female i { color: #d63384; }
  .pm-pill { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.74rem; font-weight: 700; padding: 0.22rem 0.65rem; border-radius: 999px; white-space: nowrap; }
  .pm-pill.on { background: rgba(25,135,84,0.12); color: #198754; }
  .pm-pill.on i { font-size: 0.4rem; }
  .pm-pill.off { background: rgba(255,193,7,0.16); color: #b88a00; }
  .pm-pill.off i { font-size: 0.65rem; }

  .pm-icon-btn { width: 34px; height: 34px; border-radius: 9px; border: 1px solid transparent; background: transparent; color: var(--pm-muted); display: inline-flex; align-items: center; justify-content: center; transition: background 0.15s ease, border-color 0.15s ease; }
  .pm-icon-btn:hover, .pm-icon-btn.on { background: var(--pm-soft); border-color: var(--pm-line); color: var(--pm-text); }
  .pm-menu { position: absolute; top: calc(100% + 4px); right: 0; min-width: 180px; background: var(--pm-menu); border: 1px solid var(--pm-line); border-radius: 12px; box-shadow: 0 16px 36px rgba(16,24,40,0.16); padding: 0.35rem; z-index: 1050; animation: pmMenu 0.16s ease-out; transform-origin: top right; text-align: left; }
  .pm-menu-item { display: flex; align-items: center; gap: 0.65rem; width: 100%; padding: 0.55rem 0.7rem; border: none; border-radius: 8px; background: transparent; color: var(--pm-text); font-size: 0.86rem; font-weight: 500; text-align: left; white-space: nowrap; }
  .pm-menu-item i { width: 16px; text-align: center; color: var(--pm-muted); font-size: 0.82rem; }
  .pm-menu-item:hover { background: var(--pm-soft); }

  .pm-empty { text-align: center; padding: 3rem 1rem; }
  .pm-empty .ic { width: 62px; height: 62px; border-radius: 16px; margin: 0 auto 0.9rem; background: rgba(255,193,7,0.14); color: #e0a800; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
  .pm-empty h6 { font-weight: 700; color: var(--pm-text); margin-bottom: 0.25rem; }
  .pm-empty p { color: var(--pm-muted); font-size: 0.88rem; margin: 0; }

  .pm-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; padding: 0.85rem 1.25rem; border-top: 1px solid var(--pm-line); }
  .pm-page { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 36px; padding: 0 0.6rem; border-radius: 9px; border: 1px solid transparent; background: transparent; font-size: 0.85rem; font-weight: 600; color: var(--pm-muted); transition: background 0.15s ease; }
  .pm-page:hover:not(:disabled) { background: var(--pm-soft); }
  .pm-page.on { background: #ffc107; color: #1f2328; }
  .pm-page.nav { border-color: var(--pm-line); background: var(--pm-panel); font-size: 0.75rem; }
  .pm-page:disabled { opacity: 0.4; cursor: not-allowed; }

  .pm-seg button:focus-visible, .pm-icon-btn:focus-visible, .pm-menu-item:focus-visible, .pm-page:focus-visible, .pm-link:focus-visible, .pm-clear:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

  @media (max-width: 768px) {
    .pm-title { font-size: 1.45rem; }
    .pm-sub { font-size: 0.85rem; }
    .pm-table { table-layout: auto; }
    .pm-table th { width: auto !important; }
    .pm-select { flex: 1 1 140px; }
    .pm-select select.pm-input { width: 100%; min-width: 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pm-anim, .pm-table tbody tr, .pm-menu { animation: none !important; }
  }
  .spm-wrap { zoom: 0.75; }
  @media (min-width: 1600px) { .spm-wrap { zoom: 0.9; } }
  @media (min-width: 1920px) { .spm-wrap { zoom: 1; } }
  @media (max-width: 768px) { .spm-wrap { zoom: 1; } }
  .pm-pill.inactive { background: rgba(108,117,125,0.12); color: #6c757d; }
  .pm-pill.inactive i { font-size: 0.4rem; }
  .pm-toast { position: fixed; top: 84px; left: 50%; transform: translateX(-50%); z-index: 99999; min-width: 320px; max-width: 480px; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: #fff; border: 1px solid #e9ecef; border-left: 4px solid #198754; border-radius: 12px; box-shadow: 0 16px 40px rgba(16,24,40,0.16); animation: pmToast 0.35s ease-out; }
  @keyframes pmToast { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
  .pm-toast .ic { width: 34px; height: 34px; border-radius: 50%; background: rgba(25,135,84,0.12); color: #198754; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .pm-toast .t { font-weight: 700; color: #1f2328; font-size: 0.92rem; }
  .pm-toast .d { color: #6b7280; font-size: 0.84rem; }
  .pm-toast-close { border: none; background: transparent; color: #9ca3af; width: 28px; height: 28px; border-radius: 7px; }
  .pm-toast-close:hover { background: #f3f4f6; color: #1f2328; }
  @media (max-width: 768px) { .pm-toast { min-width: 0; width: calc(100% - 2rem); top: 76px; } }
  `;

  const CACHE_TTL = 60_000;

    const loadPage = async (page, force = false) => {
    const cacheKey = `${page}`;
    const cached = pageCache[cacheKey];
    if (!force && cached && Date.now() - cached.ts < CACHE_TTL) {
      setPets(cached.pets);
      setTotalPets(cached.total);
      return;
    }

    page === 1 ? setLoading(true) : setPageLoading(true);
    try {
      const [petsRes, ownersRes] = await Promise.all([
        petAPI.getAll(page, itemsPerPage),
        ownerAPI.getAllUnpaginated()
      ]);
      const newPets = petsRes.data.pets || [];
      const total  = petsRes.data.total ?? newPets.length;

      setPageCache({ [cacheKey]: { pets: newPets, total, ts: Date.now() } });
      setPets(newPets);
      setOwners(ownersRes.data.owners || []);
      setTotalPets(total);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const res = await petAPI.getAllUnpaginated();
      const all = res.data.pets || [];
      const active = all.filter(p => p.is_active);
      setStats({
        total: active.length,
        dogs:  active.filter(p => p.species === 'dog').length,
        cats:  active.filter(p => p.species === 'cat').length,
      });
    } catch {
      // fail silently
    } finally {
      setStatsLoading(false);
    }
  };

  const loadData = () => loadPage(1);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    setPageCache({});
    if (currentPage === 1) {
      loadPage(1, true);
    } else {
      setCurrentPage(1);
    }
  }, [filterStatus, filterSpecies]);

  useEffect(() => {
    loadPage(currentPage);
  }, [currentPage]);

  useEffect(() => {
    if (showDropdown === null) return;
    const closeOnScroll = () => setShowDropdown(null);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => window.removeEventListener('scroll', closeOnScroll, true);
  }, [showDropdown]);

  const handleViewPet = async (pet) => {
    setSelectedPet(pet);
    setQrDataURL('');
    setShowViewModal(true);

    if (pet.microchip_number) {
      setQrLoading(true);
      try {
        const microchipRes = await microchipAPI.getByPetId(pet.id);
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
  };

  const getOwnerName = (pet) => {
    if (pet.owner_name) {
      return pet.owner_name;
    }
    const owner = owners.find(o => o.id === pet.owner_id);
    return owner ? `${owner.first_name} ${owner.last_name}` : 'Unknown';
  };

  const calculateAge = (birthDate) => {
    if (!birthDate || birthDate === '0000-00-00') return 'Not specified';
    
    const birth = new Date(birthDate);
    const today = new Date();
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (years === 0) {
      return `${months} month${months !== 1 ? 's' : ''}`;
    } else if (months === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`;
    } else {
      return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
    }
  };

  const filteredPets = pets.filter(pet => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      (pet.name || '').toLowerCase().includes(q) ||
      (pet.registration_number || '').toLowerCase().includes(q) ||
      getOwnerName(pet).toLowerCase().includes(q);
    const matchesSpecies = filterSpecies === 'all' || (pet.species || '').toLowerCase() === filterSpecies;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'active' ? !!pet.is_active : !pet.is_active);
    return matchesSearch && matchesSpecies && matchesStatus;
  });

  const activePets = pets.filter(p => p.is_active);

  const pmPagerNumbers = (() => {
    const pages = [];
    let start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  })();
  const getPetFaceImage = (species) => {
    const s = (species || '').toLowerCase();
    if (s === 'cat') return '/cat_face.png';
    if (s === 'rabbit') return '/rabbit_face.png';
    return '/dog_face.png';
  };
  const fmtPetDate = (value) => {
    if (!value) return '—';
    const d = new Date(String(value).replace(' ', 'T'));
    return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const hasPetFilters = searchTerm || filterSpecies !== 'all';

  return (
    <>
      <style>{styles}</style>
      {success && (
        <div className="pm-toast" role="status" aria-live="polite">
          <div className="ic"><i className="fas fa-check" /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="t">Success</div>
            <div className="d">{success}</div>
          </div>
          <button type="button" className="pm-toast-close" onClick={() => setSuccess('')} aria-label="Dismiss">
            <i className="fas fa-times" />
          </button>
        </div>
      )}
      <Container fluid className="py-4 spm-wrap" style={{ backgroundColor: darkMode ? '#0f0f0f' : '#ffffff', minHeight: '100vh', transition: 'all 0.3s ease' }}>

        {/* Header */}
        <div className="mb-4 pm-anim">
          <h2 className="pm-title mobile-title">Pet Management</h2>
          <p className="pm-sub">All pets registered by the community in Muntinlupa City.</p>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius: '12px' }}>
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

      {/* Statistics Cards */}
<Row className="mb-4">
  {[
    {
      label: 'Total Pets',
      count: stats.total,
      img: '/paw.png',
      accent: '#ffc107',
      accentAlpha: 'rgba(255,193,7,0.12)',
      delay: '0.1s'
    },
    {
      label: 'Dogs',
      count: stats.dogs,
      img: '/dog_face.png',
      accent: '#FF6B6B',
      accentAlpha: 'rgba(255,107,107,0.12)',
      delay: '0.2s'
    },
    {
      label: 'Cats',
      count: stats.cats,
      img: '/cat_face.png',
      accent: '#4ECDC4',
      accentAlpha: 'rgba(78,205,196,0.12)',
      delay: '0.3s'
    }
  ].map(({ label, count, img, accent, accentAlpha, delay }) => (
    <Col xs={4} md={6} lg={4} className="mb-3" key={label} style={{ animation: `dropDown 0.4s ease-out ${delay} backwards` }}>
      <Card
        className="border-0 h-100"
        style={{
          borderRadius: '16px',
          background: darkMode ? '#141414' : '#ffffff',
          border: darkMode ? '1px solid #222222' : '1px solid #f0f0f0',
          boxShadow: darkMode ? 'none' : '0 1px 4px rgba(0,0,0,0.06)',
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
          e.currentTarget.style.boxShadow = darkMode ? 'none' : '0 1px 4px rgba(0,0,0,0.06)';
          e.currentTarget.style.borderColor = darkMode ? '#222222' : '#f0f0f0';
        }}
      >
        {/* Accent top bar */}
        <div style={{ height: '3px', background: accent, borderRadius: '16px 16px 0 0' }} />
        <Card.Body className="mobile-card-padding" style={{ padding: '1.5rem', background: 'transparent' }}>
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <p className="mobile-stat-label" style={{
                fontSize: '0.75rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: darkMode ? '#666666' : '#999999',
                marginBottom: '0.5rem'
              }}>
                {label}
              </p>
              <h2 className="mobile-stat-number" style={{
                fontSize: '2.75rem',
                fontWeight: '700',
                color: darkMode ? '#f0f0f0' : '#111111',
                lineHeight: 1,
                marginBottom: '0.75rem',
                fontVariantNumeric: 'tabular-nums'
              }}>
                <AnimatedStatValue value={count} loading={statsLoading} darkMode={darkMode} />
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
                  color: darkMode ? '#555555' : '#aaaaaa',
                  fontWeight: '500'
                }}>
                  Active registrations
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
              <i className="fas fa-paw" style={{ fontSize: '1.4rem', color: accent, display: 'none' }} />
            </div>
          </div>
        </Card.Body>
      </Card>
    </Col>
  ))}
</Row>

        {/* Pets table */}
        <div className="pm-panel pm-anim" style={{ '--d': '0.18s', overflow: 'visible' }}>
          {/* Header */}
          <div className="pm-toolbar">
            <div className="pm-toolbar-title">
              <span>Registered pets</span>
              <span className="pm-count">{totalPets}</span>
            </div>
            <div className="pm-seg" role="group" aria-label="Status">
              {[['active', 'Active'], ['inactive', 'Inactive'], ['all', 'All']].map(([v, l]) => (
                <button key={v} type="button" className={filterStatus === v ? 'on' : ''} onClick={() => { setFilterStatus(v); setShowDropdown(null); }} aria-pressed={filterStatus === v}>{l}</button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="pm-filters">
            <div className="pm-search">
              <i className="fas fa-search" />
              <input
                className="pm-input"
                placeholder="Search by pet name, registration number, or owner..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search pets"
              />
              {searchTerm && (
                <button type="button" className="pm-clear" onClick={() => setSearchTerm('')} aria-label="Clear search">
                  <i className="fas fa-times" />
                </button>
              )}
            </div>
            <div className="pm-select">
              <i className="fas fa-paw" />
              <select className="pm-input" value={filterSpecies} onChange={(e) => setFilterSpecies(e.target.value)} aria-label="Species">
                <option value="all">All species</option>
                <option value="dog">Dogs</option>
                <option value="cat">Cats</option>
              </select>
            </div>
            {hasPetFilters && (
              <button type="button" className="pm-link" onClick={() => { setSearchTerm(''); setFilterSpecies('all'); }}>
                <i className="fas fa-undo me-1" />Clear filters
              </button>
            )}
          </div>

          {/* Body */}
          <div className="mobile-card-body" style={{ padding: '0 1.25rem 0.5rem' }}>
            {loading || pageLoading ? (
              <div style={{ padding: '0.5rem 0 1rem' }}>
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="d-flex align-items-center gap-3" style={{ padding: '0.85rem 0', borderBottom: '1px solid var(--pm-line)', opacity: 1 - i * 0.12 }}>
                    <div className={darkMode ? 'skeleton-dark' : 'skeleton'} style={{ width: 40, height: 40, borderRadius: '50%' }} />
                    <div className="flex-grow-1">
                      <div className={darkMode ? 'skeleton-dark' : 'skeleton'} style={{ width: '25%', height: 13, marginBottom: 8 }} />
                      <div className={darkMode ? 'skeleton-dark' : 'skeleton'} style={{ width: '15%', height: 10 }} />
                    </div>
                    <div className={darkMode ? 'skeleton-dark' : 'skeleton'} style={{ width: 120, height: 12 }} />
                    <div className={darkMode ? 'skeleton-dark' : 'skeleton'} style={{ width: 70, height: 22, borderRadius: 999 }} />
                  </div>
                ))}
              </div>
            ) : filteredPets.length === 0 ? (
              <div className="pm-empty">
                <div className="ic"><i className="fas fa-paw" /></div>
                <h6>No pets found</h6>
                <p>{hasPetFilters || filterStatus !== 'active' ? 'Try changing or clearing the filters.' : 'No pets have been registered by owners yet.'}</p>
              </div>
            ) : (
              <div className="table-responsive" style={{ overflow: 'visible' }}>
                <table className="pm-table mobile-table-wrap">
                  <thead>
                    <tr>
                      <th style={{ width: '24%' }}>Pet</th>
                      <th style={{ width: '17%' }}>Species / breed</th>
                      <th className="mobile-hide" style={{ width: '11%' }}>Gender</th>
                      <th className="mobile-hide" style={{ width: '18%' }}>Owner</th>
                      <th className="mobile-hide" style={{ width: '13%' }}>Registered</th>
                      <th className="mobile-hide" style={{ width: '11%' }}>Status</th>
                      <th style={{ width: '6%' }} aria-label="Actions" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPets.map((pet, i) => {
                      const menuOpen = showDropdown === pet.id;
                      return (
                        <tr key={pet.id} className={menuOpen ? 'raised' : ''} style={{ animationDelay: `${i * 0.04}s` }}>
                          <td>
                            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                              <div className="pm-face">
                                <img
                                  src={getPetFaceImage(pet.species)}
                                  alt=""
                                  className="mobile-table-img"
                                  onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }}
                                />
                                <i className="fas fa-paw" style={{ display: 'none', color: '#e0a800' }} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div className="pm-strong pm-ellipsis" title={pet.name}>{pet.name}</div>
                                <div className="pm-muted pm-mono pm-ellipsis">{pet.registration_number || 'N/A'}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="pm-strong text-capitalize" style={{ fontSize: '0.85rem' }}>{pet.species}</div>
                            <div className="pm-muted pm-ellipsis">{pet.breed || 'Mixed'}</div>
                          </td>
                          <td className="mobile-hide">
                            {pet.gender === 'male'
                              ? <span className="pm-gender male"><i className="fas fa-mars" />Male</span>
                              : <span className="pm-gender female"><i className="fas fa-venus" />Female</span>}
                          </td>
                          <td className="mobile-hide">
                            <div className="pm-ellipsis" style={{ fontSize: '0.85rem' }} title={getOwnerName(pet)}>{getOwnerName(pet)}</div>
                          </td>
                          <td className="mobile-hide">
                            <div style={{ fontSize: '0.85rem' }}>{fmtPetDate(pet.registration_date || pet.created_at)}</div>
                          </td>
                          <td className="mobile-hide">
                            <span className={`pm-pill ${pet.is_active ? 'on' : 'inactive'}`}>
                              <i className="fas fa-circle" />{pet.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                              <button
                                type="button"
                                className={`pm-icon-btn${menuOpen ? ' on' : ''}`}
                                onClick={(e) => { e.stopPropagation(); setShowDropdown(menuOpen ? null : pet.id); }}
                                aria-label={`Options for ${pet.name}`}
                                aria-expanded={menuOpen}
                              >
                                <i className="fas fa-ellipsis-v" />
                              </button>
                              {menuOpen && (
                                <>
                                  <div onClick={() => setShowDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 1049 }} />
                                  <div className="pm-menu" role="menu">
                                    <button type="button" role="menuitem" className="pm-menu-item" onClick={() => { setShowDropdown(null); handleViewPet(pet); }}>
                                      <i className="fas fa-eye" />View details
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPets > itemsPerPage && (
            <div className="pm-foot mobile-pagination">
              <span className="pm-muted page-info" style={{ fontSize: '0.84rem' }}>
                Showing <strong className="pm-strong">{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalPets)}</strong> of {totalPets}
              </span>
              <div className="d-flex align-items-center gap-1">
                <button type="button" className="pm-page nav page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} aria-label="Previous page">
                  <i className="fas fa-chevron-left" />
                </button>
                {pmPagerNumbers.map(n => (
                  <button key={n} type="button" className={`pm-page page-btn${n === currentPage ? ' on' : ''}`} onClick={() => setCurrentPage(n)} aria-current={n === currentPage ? 'page' : undefined}>{n}</button>
                ))}
                <button type="button" className="pm-page nav page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} aria-label="Next page">
                  <i className="fas fa-chevron-right" />
                </button>
              </div>
            </div>
          )}
        </div>

      {/* View Modal */}
      <Modal show={showViewModal} onHide={() => { setShowViewModal(false); setQrDataURL(''); }} size="lg" centered={window.innerWidth <= 768} style={{ zoom: '0.75' }} className="pet-modal">
        <Modal.Header closeButton style={{ borderBottom: '2px solid #ffc107', background: darkMode ? '#1a1a1a' : '#ffffff' }}>
          <Modal.Title style={{ fontWeight: '700', color: darkMode ? '#f0f0f0' : '#333' }}>
            <i className="fas fa-paw me-2" style={{ color: '#ffc107' }}></i>
            Pet Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '1.5rem', background: darkMode ? '#141414' : '#ffffff' }}>
          {selectedPet && (
            <Row>
              <Col xs={12} md={6}>
                <Card 
                  className="mb-3 border-0" 
                  style={{ 
                    borderRadius: '12px', 
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    background: darkMode ? '#1e1e1e' : '#ffffff'
                  }}
                >
                  <Card.Header style={{ background: darkMode ? '#2a2a2a' : '#f8f9fa', borderBottom: darkMode ? '2px solid #333333' : '2px solid #e9ecef' }}>
                    <h6 className="mb-0" style={{ fontWeight: '600', color: darkMode ? '#f0f0f0' : '#333' }}>
                      <i className="fas fa-info-circle me-2" style={{ color: '#ffc107' }}></i>
                      Basic Information
                    </h6>
                  </Card.Header>
                  <Card.Body style={{ background: darkMode ? '#1e1e1e' : '#ffffff' }}>
                    <Table borderless size="sm" className="pet-modal-table">
                      <tbody>
                        <tr>
                          <td style={{ width: '140px', fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Pet Name:</td>
                          <td style={{ color: darkMode ? '#f0f0f0' : '#333' }}>{selectedPet.name}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Registration No:</td>
                          <td>
                            <code style={{ 
                              background: darkMode ? '#2a2a2a' : '#f8f9fa', 
                              padding: '0.2rem 0.5rem', 
                              borderRadius: '4px',
                              color: darkMode ? '#f0f0f0' : '#333'
                            }}>
                              {selectedPet.registration_number || 'N/A'}
                            </code>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Species:</td>
                          <td style={{ color: darkMode ? '#f0f0f0' : '#333', textTransform: 'capitalize' }}>{selectedPet.species || 'Not specified'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Breed:</td>
                          <td style={{ color: darkMode ? '#f0f0f0' : '#333' }}>{selectedPet.breed || 'Not specified'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Gender:</td>
                          <td style={{ color: darkMode ? '#f0f0f0' : '#333', textTransform: 'capitalize' }}>{selectedPet.gender || 'Not specified'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Birth Date:</td>
                          <td>
                            {selectedPet.birth_date && selectedPet.birth_date !== '0000-00-00' ? (
                              <>
                                <span style={{ color: darkMode ? '#f0f0f0' : '#333' }}>
                                  {new Date(selectedPet.birth_date).toLocaleDateString()}
                                </span>
                                <br />
                                <small className="text-muted" style={{ fontWeight: '500' }}>
                                  Age: {calculateAge(selectedPet.birth_date)}
                                </small>
                              </>
                            ) : (
                              <span style={{ color: '#666' }}>Not specified</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Sterilized:</td>
                          <td>
                            {selectedPet.sterilized ? (
                              <>
                                <Badge 
                                  bg="success"
                                  style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}
                                >
                                  {selectedPet.gender === 'male' ? 'Neutered' : 'Spayed'}
                                </Badge>
                                {selectedPet.sterilization_date && (
                                  <div className="mt-1">
                                    <small className="text-muted" style={{ fontWeight: '500' }}>
                                      Date: {new Date(selectedPet.sterilization_date).toLocaleDateString()}
                                    </small>
                                  </div>
                                )}
                                {selectedPet.sterilized_by && (
                                  <div>
                                    <small className="text-muted" style={{ fontWeight: '500' }}>
                                      By: {selectedPet.sterilized_by}
                                    </small>
                                  </div>
                                )}
                              </>
                            ) : (
                              <Badge 
                                bg="secondary"
                                style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}
                              >
                                Not Sterilized
                              </Badge>
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
                </Col>
              
              <Col xs={12} md={6}>
                <Card 
                  className="mb-3 border-0" 
                  style={{ 
                    borderRadius: '12px', 
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    background: darkMode ? '#1e1e1e' : '#ffffff'
                  }}
                >
                  <Card.Header style={{ background: darkMode ? '#2a2a2a' : '#f8f9fa', borderBottom: darkMode ? '2px solid #333333' : '2px solid #e9ecef' }}>
                    <h6 className="mb-0" style={{ fontWeight: '600', color: darkMode ? '#f0f0f0' : '#333' }}>
                      <i className="fas fa-clipboard-list me-2" style={{ color: '#ffc107' }}></i>
                      Additional Details
                    </h6>
                  </Card.Header>
                  <Card.Body style={{ background: darkMode ? '#1e1e1e' : '#ffffff' }}>
                    <Table borderless size="sm" className="pet-modal-table">
                      <tbody>
                        <tr>
                          <td style={{ width: '140px', fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Owner:</td>
                          <td style={{ color: darkMode ? '#f0f0f0' : '#333' }}>{getOwnerName(selectedPet)}</td>
                        </tr>
                    
                        <tr>
                          <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Weight:</td>
                          <td>
                            {selectedPet.weight ? (
                              <>
                                <span style={{ color: darkMode ? '#f0f0f0' : '#333' }}>{selectedPet.weight} kg</span>
                                <br />
                                <small className="text-muted" style={{ fontWeight: '500' }}>
                                  {(selectedPet.weight * 2.20462).toFixed(2)} lbs
                                </small>
                              </>
                            ) : (
                              <span style={{ color: '#666' }}>Not specified</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Registration Date:</td>
                          <td style={{ color: darkMode ? '#f0f0f0' : '#333' }}>
                            {selectedPet.registration_date 
                              ? new Date(selectedPet.registration_date).toLocaleDateString()
                              : new Date(selectedPet.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: '600', color: '#555' }}>Status:</td>
                          <td>
                            <Badge 
                              bg={selectedPet.is_active ? 'success' : 'secondary'}
                              style={{ fontSize: '0.85rem', padding: '0.4rem 0.8rem', borderRadius: '8px' }}
                            >
                              {selectedPet.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                        </tr>
                        {selectedPet.special_notes && (
                          <tr>
                            <td style={{ fontWeight: '600', color: darkMode ? '#aaaaaa' : '#555' }}>Special Notes:</td>
                            <td style={{ color: darkMode ? '#f0f0f0' : '#333' }}>{selectedPet.special_notes}</td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </Card.Body>
                </Card>
              {selectedPet?.microchip_number && (
                <Card
                  className="mb-3 border-0"
                  style={{
                    borderRadius: '12px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
                    background: darkMode ? '#1e1e1e' : '#ffffff'
                  }}
                >
                  <Card.Header style={{
                    background: darkMode ? 'rgba(67,97,238,0.15)' : 'rgba(67,97,238,0.08)',
                    borderBottom: '2px solid rgba(67,97,238,0.2)'
                  }}>
                    <h6 className="mb-0" style={{ fontWeight: '600', color: darkMode ? '#f0f0f0' : '#333' }}>
                      <i className="fas fa-qrcode me-2" style={{ color: '#4361ee' }}></i>
                      Microchip QR Code
                    </h6>
                  </Card.Header>
                  <Card.Body className="text-center" style={{ background: darkMode ? '#1e1e1e' : '#ffffff' }}>
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
                          style={{
                            width: '160px',
                            height: '160px',
                            borderRadius: '10px',
                            border: '3px solid #4361ee',
                            padding: '4px',
                            background: '#fff',
                            boxShadow: '0 4px 16px rgba(67,97,238,0.15)'
                          }}
                        />
                        <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                          {selectedPet.microchip_number}
                        </div>
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = qrDataURL;
                            link.download = `QR_${selectedPet.name}_${selectedPet.microchip_number}.png`;
                            link.click();
                          }}
                          style={{
                            marginTop: '0.75rem',
                            background: '#4361ee',
                            border: 'none',
                            color: '#fff',
                            borderRadius: '8px',
                            padding: '0.4rem 1rem',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                          }}
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
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer style={{ borderTop: darkMode ? '2px solid #333333' : '2px solid #e9ecef', background: darkMode ? '#1a1a1a' : '#ffffff' }}>
          <Button 
            variant="secondary" 
            onClick={() => setShowViewModal(false)}
            style={{ 
              borderRadius: '8px',
              padding: '0.5rem 1.5rem',
              fontWeight: '600'
            }}
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>

    </>
  );
};

export default SuperPetManagement;