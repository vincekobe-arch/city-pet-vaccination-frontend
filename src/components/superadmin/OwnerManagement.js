import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge, Table, InputGroup, Form, Modal, ListGroup } from 'react-bootstrap';
import api, { ownerAPI, petAPI, handleAPIError } from '../../services/api';

const AnimatedStatValue = ({ value, loading }) => {
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
        display: 'inline-block', width: '3ch', height: '1em',
        borderRadius: '6px',
        background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        backgroundSize: '800px 100%',
        animation: 'shimmer 1.4s ease-in-out infinite',
        verticalAlign: 'middle'
      }} />
    );
  }
  return displayValue;
};

const SuperAdminOwnerManagement = () => {
  const [owners, setOwners] = useState([]);
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [totalOwners, setTotalOwners] = useState(0);
  const [pageCache, setPageCache] = useState({});
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVerif, setFilterVerif] = useState('all');
  const [filterActive, setFilterActive] = useState('1');
  
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [ownerPets, setOwnerPets] = useState([]);
  const [viewLoading, setViewLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(null);

  useEffect(() => {
    if (showDropdown === null) return;
    const closeOnScroll = () => setShowDropdown(null);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => window.removeEventListener('scroll', closeOnScroll, true);
  }, [showDropdown]);

  // Verification modal state
  const [showVerifModal, setShowVerifModal] = useState(false);
  const [verifOwner, setVerifOwner] = useState(null);
  const [verifLoading, setVerifLoading] = useState(false);
  const [verifSuccess, setVerifSuccess] = useState('');
  const [verifError, setVerifError] = useState('');

  const VERIF_CONFIG = {
    not_verified:   { label: 'Not Verified',   color: '#dc3545', icon: 'fa-times-circle' },
    pending:        { label: 'Pending Review', color: '#fd7e14', icon: 'fa-hourglass-half' },
    semi_verified:  { label: 'Semi Verified',  color: '#0d6efd', icon: 'fa-shield-alt' },
    fully_verified: { label: 'Fully Verified', color: '#198754', icon: 'fa-check-circle' },
  };

  const ownerAPI_verify = (ownerId, status, notes = '') => {
    return api.put(`/owners/${ownerId}/verify`, {
      verification_status: status,
      ...(notes ? { verification_notes: notes } : {}),
    });
  };
  
  // Pagination state for pets in modal
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const petsPerPage = 5;
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalOwners / itemsPerPage);

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
      .mobile-modal-title { font-size: 0.95rem !important; }
      .mobile-modal-body { font-size: 0.8rem !important; }
      .mobile-modal-body td, .mobile-modal-body th { font-size: 0.78rem !important; padding: 0.35rem 0.5rem !important; }
      .mobile-modal-body h6 { font-size: 0.85rem !important; }
      .mobile-modal-body .badge { font-size: 0.7rem !important; padding: 0.25rem 0.5rem !important; }
      .mobile-verif-title { font-size: 0.8rem !important; }
      .mobile-verif-title span { display: none !important; }
      .mobile-verif-body { font-size: 0.78rem !important; }
      .mobile-verif-body small { font-size: 0.7rem !important; }
      .mobile-verif-body p { font-size: 0.78rem !important; }
      .mobile-verif-body img { max-height: 110px !important; }
      .mobile-verif-actions { flex-direction: column !important; }
      .mobile-verif-actions button { width: 100% !important; font-size: 0.78rem !important; padding: 0.5rem 1rem !important; }
    }
    /* ---------------- Community Management ---------------- */
    @keyframes cmIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes cmRow { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes cmMenu { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes cmToast { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
    @keyframes cmGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    .cm-anim { animation: cmIn 0.45s ease-out backwards; animation-delay: var(--d, 0s); }
    .cm-title { font-weight: 700; color: #1f2328; font-size: 1.85rem; margin: 0; }
    .cm-sub { color: #6b7280; font-size: 0.95rem; margin: 0.15rem 0 0; }

    .cm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; border-radius: 10px; border: 1px solid transparent; font-weight: 600; font-size: 0.86rem; padding: 0.5rem 0.95rem; white-space: nowrap; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
    .cm-btn.lg { padding: 0.7rem 1.25rem; font-size: 0.92rem; }
    .cm-btn.primary { background: #ffc107; color: #1f2328; }
    .cm-btn.primary:hover { background: #f0b400; box-shadow: 0 6px 16px rgba(255,193,7,0.35); transform: translateY(-1px); }

    .cm-toast { position: fixed; top: 84px; left: 50%; transform: translateX(-50%); z-index: 99999; min-width: 320px; max-width: 480px; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: #fff; border: 1px solid #e9ecef; border-left: 4px solid #198754; border-radius: 12px; box-shadow: 0 16px 40px rgba(16,24,40,0.16); animation: cmToast 0.35s ease-out; }
    .cm-toast .ic { width: 34px; height: 34px; border-radius: 50%; background: rgba(25,135,84,0.12); color: #198754; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .cm-toast .t { font-weight: 700; color: #1f2328; font-size: 0.92rem; }
    .cm-toast .d { color: #6b7280; font-size: 0.84rem; }
    .cm-toast-close { border: none; background: transparent; color: #9ca3af; width: 28px; height: 28px; border-radius: 7px; }
    .cm-toast-close:hover { background: #f3f4f6; color: #1f2328; }

    .cm-panel { background: #fff; border: 1px solid #e9ecef; border-radius: 14px; box-shadow: 0 1px 3px rgba(16,24,40,0.04); overflow: hidden; }
    .cm-panel-head { display: flex; align-items: center; gap: 0.75rem; padding: 0.95rem 1.1rem; border-bottom: 1px solid #eef0f3; }
    .cm-head-ic { width: 36px; height: 36px; border-radius: 10px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.9rem; flex-shrink: 0; }
    .cm-panel-title { font-weight: 700; color: #1f2328; font-size: 0.95rem; }
    .cm-panel-sub { font-size: 0.76rem; color: #6b7280; }

    .cm-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem; padding: 1rem 1.25rem 0.75rem; }
    .cm-toolbar-title { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; font-size: 1.02rem; color: #1f2328; }
    .cm-count { font-size: 0.75rem; font-weight: 700; padding: 0.1rem 0.55rem; border-radius: 999px; background: #1f2328; color: #fff; }
    .cm-seg { display: inline-flex; padding: 3px; border-radius: 10px; background: #f3f4f6; }
    .cm-seg button { border: none; background: transparent; padding: 0.35rem 0.85rem; border-radius: 8px; font-size: 0.82rem; font-weight: 600; color: #5b6270; transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
    .cm-seg button:hover { color: #1f2328; }
    .cm-seg button.on { background: #fff; color: #1f2328; box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
    .cm-filters { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; padding: 0 1.25rem 1rem; border-bottom: 1px solid #eef0f3; }
    .cm-search, .cm-select { position: relative; }
    .cm-search { flex: 1 1 260px; }
    .cm-search > i, .cm-select > i { position: absolute; left: 0.75rem; top: 50%; transform: translateY(-50%); color: #9ca3af; font-size: 0.78rem; pointer-events: none; }
    .cm-input { width: 100%; height: 38px; border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; padding: 0 0.85rem 0 2.1rem; font-size: 0.86rem; color: #1f2328; outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .cm-input:focus { border-color: #e0a800; box-shadow: 0 0 0 3px rgba(255,193,7,0.2); }
    select.cm-input { width: auto; min-width: 170px; padding-right: 2rem; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 0.7rem center; background-size: 12px; }
    .cm-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 26px; height: 26px; border: none; border-radius: 7px; background: transparent; color: #9ca3af; }
    .cm-clear:hover { background: #f3f4f6; color: #1f2328; }
    .cm-link { border: none; background: none; padding: 0 0.25rem; color: #0d6efd; font-size: 0.82rem; font-weight: 600; }
    .cm-link:hover { text-decoration: underline; }

    .cm-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .cm-table th { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; padding: 0.85rem 0.65rem 0.6rem; border-bottom: 1px solid #eef0f3; white-space: nowrap; text-align: left; }
    .cm-table td { padding: 0.8rem 0.65rem; border-bottom: 1px solid #f3f4f6; vertical-align: middle; font-size: 0.86rem; color: #1f2328; }
    .cm-table tbody tr { animation: cmRow 0.35s ease-out backwards; transition: background 0.15s ease; }
    .cm-table tbody tr:hover { background: #fafbfc; }
    .cm-table tbody tr:last-child td { border-bottom: none; }
    .cm-table tbody tr.raised { position: relative; z-index: 5; }
    .cm-strong { font-weight: 600; color: #1f2328; }
    .cm-muted { font-size: 0.78rem; color: #6b7280; }
    .cm-ellipsis { max-width: 340px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cm-date { width: 48px; flex-shrink: 0; border-radius: 10px; background: color-mix(in srgb, var(--c) 10%, #fff); text-align: center; padding: 0.35rem 0; line-height: 1.1; }
    .cm-date .m { display: block; font-size: 0.62rem; font-weight: 700; color: var(--c); text-transform: uppercase; letter-spacing: 0.06em; }
    .cm-date .d { display: block; font-size: 1.2rem; font-weight: 800; color: #1f2328; }
    .cm-type-ic { width: 34px; height: 34px; border-radius: 9px; background: color-mix(in srgb, var(--c) 12%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0; }
    .cm-bar { height: 5px; border-radius: 3px; background: #eef0f3; margin-top: 0.35rem; overflow: hidden; max-width: 130px; }
    .cm-bar > div { height: 100%; border-radius: 3px; transform-origin: left; animation: cmGrow 0.9s cubic-bezier(0.22,1,0.36,1) backwards 0.2s; }
    .cm-pill { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.74rem; font-weight: 700; padding: 0.22rem 0.65rem; border-radius: 999px; white-space: nowrap; }
    .cm-pill i { font-size: 0.4rem; }

    .cm-icon-btn { width: 34px; height: 34px; border-radius: 9px; border: 1px solid transparent; background: transparent; color: #6b7280; display: inline-flex; align-items: center; justify-content: center; transition: background 0.15s ease, border-color 0.15s ease; }
    .cm-icon-btn:hover, .cm-icon-btn.on { background: #f3f4f6; border-color: #e5e7eb; color: #1f2328; }
    .cm-menu { position: absolute; top: calc(100% + 4px); right: 0; min-width: 200px; background: #fff; border: 1px solid #e9ecef; border-radius: 12px; box-shadow: 0 16px 36px rgba(16,24,40,0.14); padding: 0.35rem; z-index: 1050; animation: cmMenu 0.16s ease-out; transform-origin: top right; text-align: left; }
    .cm-menu-item { display: flex; align-items: center; gap: 0.65rem; width: 100%; padding: 0.55rem 0.7rem; border: none; border-radius: 8px; background: transparent; color: #1f2328; font-size: 0.86rem; font-weight: 500; text-align: left; white-space: nowrap; }
    .cm-menu-item i { width: 16px; text-align: center; color: #6b7280; font-size: 0.82rem; }
    .cm-menu-item:hover { background: #f6f7f9; }
    .cm-menu-item.danger, .cm-menu-item.danger i { color: #dc3545; }
    .cm-menu-item.danger:hover { background: #fff5f5; }
    .cm-menu-sep { height: 1px; background: #f0f1f3; margin: 0.3rem 0.2rem; }

    .cm-empty { text-align: center; padding: 3rem 1rem; }
    .cm-empty .ic { width: 62px; height: 62px; border-radius: 16px; margin: 0 auto 0.9rem; background: rgba(255,193,7,0.14); color: #e0a800; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
    .cm-empty h6 { font-weight: 700; color: #1f2328; margin-bottom: 0.25rem; }
    .cm-empty p { color: #6b7280; font-size: 0.88rem; margin-bottom: 1rem; }
    .cm-skel { border-radius: 8px; background: linear-gradient(90deg, #f3f4f6 25%, #e9ebee 37%, #f3f4f6 63%); background-size: 400% 100%; animation: shimmer 1.4s ease-in-out infinite; }

    .cm-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; padding: 0.85rem 1.25rem; border-top: 1px solid #eef0f3; }
    .cm-page { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 36px; padding: 0 0.6rem; border-radius: 9px; border: 1px solid transparent; background: transparent; font-size: 0.85rem; font-weight: 600; color: #4b5563; transition: background 0.15s ease; }
    .cm-page:hover:not(:disabled) { background: #f3f4f6; }
    .cm-page.on { background: #ffc107; color: #1f2328; }
    .cm-page.nav { border-color: #e5e7eb; background: #fff; font-size: 0.75rem; }
    .cm-page:disabled { opacity: 0.4; cursor: not-allowed; }

    .cm-btn:focus-visible, .cm-seg button:focus-visible, .cm-icon-btn:focus-visible, .cm-menu-item:focus-visible, .cm-page:focus-visible, .cm-link:focus-visible, .cm-clear:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    @media (max-width: 768px) {
      .cm-title { font-size: 1.45rem; }
      .cm-sub { font-size: 0.85rem; }
      .cm-filters select.cm-input { min-width: 0; width: 100%; }
      .cm-select { flex: 1 1 140px; }
      .cm-ellipsis { max-width: 160px; }
      .cm-toast { min-width: 0; width: calc(100% - 2rem); top: 76px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .cm-anim, .cm-table tbody tr, .cm-menu, .cm-toast, .cm-bar > div, .cm-skel { animation: none !important; }
    }
    .cm-toolbar { border-bottom: 1px solid #eef0f3; padding-bottom: 1rem; }
    .cm-filters { padding-top: 1rem; }
    .cm-table { table-layout: fixed; }
    .cm-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #ffe08a, #ffc107); color: #1f2328; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 800; flex-shrink: 0; }
    .cm-ic { width: 14px; margin-right: 0.4rem; color: #9ca3af; font-size: 0.72rem; }
    .cm-pets { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 700; color: #9ca3af; }
    .cm-pets i { font-size: 0.72rem; }
    .cm-pets.has { color: #1f2328; }
    .cm-pets.has i { color: #e0a800; }
    .cm-pill i { font-size: 0.68rem; }
    .cm-active { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; font-weight: 600; }
    .cm-active i { font-size: 0.42rem; }
    .cm-active.on { color: #198754; }
    .cm-active.off { color: #6b7280; }
    .cm-menu { min-width: 230px; }
    .cm-menu-item.info, .cm-menu-item.info i { color: #0d6efd; }
    .cm-menu-item.info:hover { background: #f0f4ff; }
    .cm-menu-item.warn, .cm-menu-item.warn i { color: #b88a00; }
    .cm-menu-item.warn:hover { background: #fff8e1; }
    .cm-menu-note { display: flex; gap: 0.5rem; align-items: flex-start; padding: 0.55rem 0.7rem; margin-top: 0.2rem; border-radius: 8px; background: #fafbfc; color: #6b7280; font-size: 0.78rem; line-height: 1.45; white-space: normal; }
    .cm-menu-note i { margin-top: 2px; color: #9ca3af; }
    @media (max-width: 768px) {
      .cm-table { table-layout: auto; }
      .cm-table th { width: auto !important; }
    }
    .som-wrap { zoom: 0.75; }
    @media (min-width: 1600px) { .som-wrap { zoom: 0.9; } }
    @media (min-width: 1920px) { .som-wrap { zoom: 1; } }
    @media (max-width: 768px) { .som-wrap { zoom: 1; } }
  `;

  const CACHE_TTL = 60_000;

  const loadPage = async (page, force = false) => {
    const cacheKey = `${page}`;
    const cached = pageCache[cacheKey];
    if (!force && cached && Date.now() - cached.ts < CACHE_TTL) {
      setOwners(cached.owners);
      setTotalOwners(cached.total);
      return;
    }

    page === 1 ? setLoading(true) : setPageLoading(true);
    try {
      const [ownersRes, petsRes] = await Promise.all([
        ownerAPI.getAll(page, itemsPerPage),
        petAPI.getAllUnpaginated()
      ]);
      const newOwners = ownersRes.data.owners || [];
      const total     = ownersRes.data.total  ?? newOwners.length;

      setPageCache({ [cacheKey]: { owners: newOwners, total, ts: Date.now() } });
      setOwners(newOwners);
      setPets(petsRes.data.pets || []);
      setTotalOwners(total);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  const loadData = () => loadPage(1);

  useEffect(() => {
    loadPage(currentPage);
  }, [currentPage]);

  useEffect(() => {
    setPageCache({});
    if (currentPage === 1) {
      loadPage(1, true);
    } else {
      setCurrentPage(1);
    }
  }, [filterVerif, filterActive]);

  const handleViewOwner = async (owner) => {
    setSelectedOwner(owner);
    setViewLoading(true);
    setShowViewModal(true);
    setShowDropdown(null);
    setModalCurrentPage(1); // Reset to first page
    
    try {
      const userPets = owner.pet_owner_id 
        ? pets.filter(pet => parseInt(pet.owner_id) === parseInt(owner.pet_owner_id))
        : [];
      
      console.log('Owner:', owner);
      console.log('Filtered Pets:', userPets);
      
      setOwnerPets(userPets);
    } catch (err) {
      console.error('Error filtering pets:', err);
      setOwnerPets([]);
    } finally {
      setViewLoading(false);
    }
  };

  const handleOpenVerifModal = async (owner) => {
    setVerifOwner(owner);
    setVerifError('');
    setVerifSuccess('');
    setShowVerifModal(true);
    setShowDropdown(null);
    // Fetch single owner to get full image fields
    try {
      const res = await ownerAPI.getByUserId(owner.user_id);
      const fresh = res.data.owner;
      console.log('RAW valid_id_front (first 100 chars):', fresh?.valid_id_front?.substring(0, 100));
      console.log('valid_id_front length:', fresh?.valid_id_front?.length);
      if (fresh) setVerifOwner(prev => ({ ...prev, ...fresh }));
    } catch {
      // keep the original owner data already set above
    }
  };

  const handleVerifyAction = async (status) => {
    setVerifLoading(true);
    setVerifError('');
    try {
      await ownerAPI_verify(verifOwner.user_id, status);
      setVerifSuccess(`Community status updated to: ${VERIF_CONFIG[status]?.label}`);
      await loadPage(currentPage, true);
      const petsRes = await petAPI.getAllUnpaginated();
      setPets(petsRes.data.pets || []);
      // Sync verifOwner with the fresh data so images reflect immediately
      try {
        const singleRes = await ownerAPI.getByUserId(verifOwner.user_id);
        if (singleRes.data.owner) setVerifOwner(prev => ({ ...prev, ...singleRes.data.owner }));
      } catch {
        setVerifOwner(prev => ({ ...prev, verification_status: status }));
      }
      if (status === 'not_verified') {
        setTimeout(() => setShowVerifModal(false), 1500);
      }
    } catch (err) {
      setVerifError('Failed to update verification status. Please try again.');
    } finally {
      setVerifLoading(false);
    }
  };

  const getOwnerPetCount = (owner) => {
    if (owner.total_pets !== undefined) {
      return parseInt(owner.total_pets);
    }
    if (!owner.pet_owner_id) return 0;
    return pets.filter(pet => parseInt(pet.owner_id) === parseInt(owner.pet_owner_id)).length;
  };

  const calculateAge = (birthDate) => {
    if (!birthDate || birthDate === '0000-00-00') return 'N/A';
    const years = Math.floor((new Date() - new Date(birthDate)) / (365.25 * 24 * 60 * 60 * 1000));
    return `${years} yr${years !== 1 ? 's' : ''}`;
  };

  // Pagination logic for modal
  const indexOfLastPet = modalCurrentPage * petsPerPage;
  const indexOfFirstPet = indexOfLastPet - petsPerPage;
  const currentPets = ownerPets.slice(indexOfFirstPet, indexOfLastPet);
  const modalTotalPages = Math.ceil(ownerPets.length / petsPerPage);

  const handleModalNextPage = () => {
    if (modalCurrentPage < modalTotalPages) {
      setModalCurrentPage(modalCurrentPage + 1);
    }
  };

  const handleModalPrevPage = () => {
    if (modalCurrentPage > 1) {
      setModalCurrentPage(modalCurrentPage - 1);
    }
  };

  const filteredOwners = owners.filter(owner => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${owner.first_name || ''} ${owner.last_name || ''}`.toLowerCase();
    const poFullName = `${owner.po_first_name || ''} ${owner.po_last_name || ''}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchLower) ||
      poFullName.includes(searchLower) ||
      (owner.email || '').toLowerCase().includes(searchLower) ||
      (owner.phone || '').includes(searchTerm) ||
      (owner.po_phone || '').includes(searchTerm) ||
      (owner.username || '').toLowerCase().includes(searchLower);
    const matchesVerif  = filterVerif  === 'all' || owner.verification_status === filterVerif;
    const matchesActive = filterActive === 'all' || String(owner.is_active) === filterActive;
    return matchesSearch && matchesVerif && matchesActive;
  });

  const activeOwners = owners.filter(o => o.is_active);
  const cmPagerNumbers = (() => {
    const pages = [];
    let start = Math.max(1, currentPage - 1);
    const end = Math.min(totalPages, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  })();
  const hasOwnerFilters = searchTerm || filterVerif !== 'all' || filterActive !== '1';
  const lastLoginInfo = (ll) => {
    if (!ll) return { label: 'Never signed in', color: '#9ca3af' };
    const diffDay = Math.floor((Date.now() - new Date(String(ll).replace(' ', 'T')).getTime()) / 86400000);
    const diffWk = Math.floor(diffDay / 7);
    const diffMo = Math.floor(diffDay / 30);
    if (diffDay <= 0) return { label: 'Signed in today', color: '#198754' };
    if (diffDay === 1) return { label: 'Signed in yesterday', color: '#198754' };
    if (diffDay < 7) return { label: `Signed in ${diffDay}d ago`, color: '#198754' };
    if (diffDay < 30) return { label: `Signed in ${diffWk}w ago`, color: '#b88a00' };
    if (diffMo < 3) return { label: `Signed in ${diffMo}mo ago`, color: '#fd7e14' };
    return { label: `Signed in ${diffMo}mo ago`, color: '#dc3545' };
  };

  const totalPets = pets.length;

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4 som-wrap" style={{ backgroundColor: '#ffffff', minHeight: '100vh' }}>

        {/* Header */}
        <div className="mb-4 cm-anim">
          <h2 className="cm-title mobile-title">Community Management</h2>
          <p className="cm-sub">Pet owners registered in PetUnity, their pets and ID verification.</p>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')} style={{ borderRadius: '12px' }}>
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

      {/* Statistics */}
      <Row className="mb-4">
        {[
          {
            label: 'Active Communities',
            count: activeOwners.length,
            img: '/users.png',
            accent: '#0dcaf0',
            accentAlpha: 'rgba(13,202,240,0.12)',
            fallbackIcon: 'fa-users',
            description: 'Active Members',
            delay: '0.1s'
          },
          {
            label: 'Total Pets',
            count: totalPets,
            img: '/paw.png',
            accent: '#ffc107',
            accentAlpha: 'rgba(255,193,7,0.12)',
            fallbackIcon: 'fa-paw',
            description: 'Registered Pets',
            delay: '0.2s'
          },
          {
            label: 'Average',
            count: activeOwners.length > 0 ? (totalPets / activeOwners.length).toFixed(1) : 0,
            img: '/average.png',
            accent: '#198754',
            accentAlpha: 'rgba(25,135,84,0.12)',
            fallbackIcon: 'fa-calculator',
            description: 'Average Pets per Owner',
            delay: '0.3s'
          }
        ].map(({ label, count, img, accent, accentAlpha, fallbackIcon, description, delay }) => (
          <Col xs={4} md={6} lg={4} className="mb-3" key={label} style={{ animation: `dropDown 0.4s ease-out ${delay} backwards` }}>
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
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      <AnimatedStatValue value={count} loading={loading} />
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
          </Col>
        ))}
      </Row>

      {/* Communities table */}
      <div className="cm-panel cm-anim" style={{ '--d': '0.18s', overflow: 'visible' }}>
        {/* Header */}
        <div className="cm-toolbar">
          <div className="cm-toolbar-title">
            <span>Communities</span>
            <span className="cm-count">{totalOwners}</span>
          </div>
          <div className="cm-seg" role="group" aria-label="Account status">
            {[['1', 'Active'], ['0', 'Inactive'], ['all', 'All']].map(([v, l]) => (
              <button key={v} type="button" className={filterActive === v ? 'on' : ''} onClick={() => { setFilterActive(v); setCurrentPage(1); setShowDropdown(null); }} aria-pressed={filterActive === v}>{l}</button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="cm-filters">
          <div className="cm-search">
            <i className="fas fa-search" />
            <input
              className="cm-input"
              placeholder="Search by name, email, phone, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search communities"
            />
            {searchTerm && (
              <button type="button" className="cm-clear" onClick={() => setSearchTerm('')} aria-label="Clear search">
                <i className="fas fa-times" />
              </button>
            )}
          </div>
          <div className="cm-select">
            <i className="fas fa-shield-alt" />
            <select className="cm-input" value={filterVerif} onChange={(e) => { setFilterVerif(e.target.value); setCurrentPage(1); }} aria-label="Verification">
              <option value="all">All verification</option>
              <option value="not_verified">Not Verified</option>
              <option value="pending">Pending Review</option>
              <option value="semi_verified">Semi Verified</option>
              <option value="fully_verified">Fully Verified</option>
            </select>
          </div>
          {hasOwnerFilters && (
            <button type="button" className="cm-link" onClick={() => { setSearchTerm(''); setFilterVerif('all'); setFilterActive('1'); setCurrentPage(1); }}>
              <i className="fas fa-undo me-1" />Clear filters
            </button>
          )}
        </div>

        {/* Body */}
        <div className="mobile-card-body" style={{ padding: '0 1.25rem 0.5rem' }}>
          {loading || pageLoading ? (
            <div style={{ padding: '0.5rem 0 1rem' }}>
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="d-flex align-items-center gap-3" style={{ padding: '0.85rem 0', borderBottom: '1px solid #f3f4f6', opacity: 1 - i * 0.12 }}>
                  <div className="skeleton" style={{ width: 38, height: 38, borderRadius: '50%' }} />
                  <div className="flex-grow-1">
                    <div className="skeleton" style={{ width: '25%', height: 13, marginBottom: 8 }} />
                    <div className="skeleton" style={{ width: '15%', height: 10 }} />
                  </div>
                  <div className="skeleton" style={{ width: 160, height: 12 }} />
                  <div className="skeleton" style={{ width: 100, height: 22, borderRadius: 999 }} />
                </div>
              ))}
            </div>
          ) : filteredOwners.length === 0 ? (
            <div className="cm-empty">
              <div className="ic"><i className="fas fa-users" /></div>
              <h6>No communities found</h6>
              <p>{hasOwnerFilters ? 'Try changing or clearing the filters.' : 'No communities have registered yet.'}</p>
            </div>
          ) : (
            <div className="table-responsive" style={{ overflow: 'visible' }}>
              <table className="cm-table mobile-table-wrap">
                <thead>
                  <tr>
                    <th style={{ width: '25%' }}>Name</th>
                    <th className="mobile-hide" style={{ width: '25%' }}>Contact</th>
                    <th className="mobile-hide" style={{ width: '8%' }}>Pets</th>
                    <th style={{ width: '17%' }}>Verification</th>
                    <th className="mobile-hide" style={{ width: '19%' }}>Account</th>
                    <th style={{ width: '6%' }} aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filteredOwners.map((owner, i) => {
                    const petCount = getOwnerPetCount(owner);
                    const firstName = owner.po_first_name || owner.first_name || '';
                    const lastName = owner.po_last_name || owner.last_name || '';
                    const phone = owner.po_phone || owner.phone;
                    const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || '?';
                    const verif = VERIF_CONFIG[owner.verification_status] || VERIF_CONFIG.not_verified;
                    const login = lastLoginInfo(owner.last_login);
                    const key = owner.user_id || owner.id;
                    const menuOpen = showDropdown === owner.user_id;
                    return (
                      <tr key={key} className={menuOpen ? 'raised' : ''} style={{ animationDelay: `${i * 0.04}s` }}>
                        <td>
                          <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
                            <div className="cm-avatar">{initials}</div>
                            <div style={{ minWidth: 0 }}>
                              <div className="cm-strong cm-ellipsis" title={`${firstName} ${lastName}`}>{firstName} {lastName}</div>
                              <div className="cm-muted text-capitalize">{owner.gender || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="mobile-hide">
                          <div className="cm-ellipsis" style={{ fontSize: '0.84rem' }} title={owner.email}>
                            <i className="fas fa-envelope cm-ic" />{owner.email || '—'}
                          </div>
                          <div className="cm-muted">
                            <i className="fas fa-phone-alt cm-ic" />{phone || '—'}
                          </div>
                        </td>
                        <td className="mobile-hide">
                          <span className={`cm-pets${petCount > 0 ? ' has' : ''}`}>
                            <i className="fas fa-paw" />{petCount}
                          </span>
                        </td>
                        <td>
                          <span className="cm-pill" style={{ color: verif.color, background: `color-mix(in srgb, ${verif.color} 12%, #fff)` }}>
                            <i className={`fas ${verif.icon}`} />{verif.label}
                          </span>
                        </td>
                        <td className="mobile-hide">
                          <div className={`cm-active ${owner.is_active ? 'on' : 'off'}`}>
                            <i className="fas fa-circle" />{owner.is_active ? 'Active' : 'Inactive'}
                          </div>
                          <div className="cm-muted" style={{ color: login.color, fontWeight: owner.last_login ? 600 : 400 }}>{login.label}</div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button
                              type="button"
                              className={`cm-icon-btn${menuOpen ? ' on' : ''}`}
                              onClick={() => setShowDropdown(menuOpen ? null : owner.user_id)}
                              aria-label={`Options for ${firstName} ${lastName}`}
                              aria-expanded={menuOpen}
                            >
                              <i className="fas fa-ellipsis-v" />
                            </button>
                            {menuOpen && (
                              <>
                                <div onClick={() => setShowDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 1049 }} />
                                <div className="cm-menu" role="menu">
                                  <button type="button" role="menuitem" className="cm-menu-item" onClick={() => handleViewOwner(owner)}>
                                    <i className="fas fa-eye" />View community
                                  </button>
                                  {owner.verification_status !== 'not_verified' ? (
                                    <button type="button" role="menuitem" className={`cm-menu-item${owner.verification_status === 'pending' ? ' warn' : ' info'}`} onClick={() => handleOpenVerifModal(owner)}>
                                      <i className="fas fa-id-card" />{owner.verification_status === 'pending' ? 'Review ID verification' : 'View ID verification'}
                                    </button>
                                  ) : (
                                    <div className="cm-menu-note">
                                      <i className="fas fa-info-circle" />This user hasn't submitted an ID yet.
                                    </div>
                                  )}
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
        {totalOwners > itemsPerPage && (
          <div className="cm-foot mobile-pagination">
            <span className="cm-muted page-info" style={{ fontSize: '0.84rem' }}>
              Showing <strong style={{ color: '#1f2328' }}>{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, totalOwners)}</strong> of {totalOwners}
            </span>
            <div className="d-flex align-items-center gap-1">
              <button type="button" className="cm-page nav page-btn" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1} aria-label="Previous page">
                <i className="fas fa-chevron-left" />
              </button>
              {cmPagerNumbers.map(n => (
                <button key={n} type="button" className={`cm-page page-btn${n === currentPage ? ' on' : ''}`} onClick={() => setCurrentPage(n)} aria-current={n === currentPage ? 'page' : undefined}>{n}</button>
              ))}
              <button type="button" className="cm-page nav page-btn" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages} aria-label="Next page">
                <i className="fas fa-chevron-right" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* View Community Details Modal */}
      <Modal 
        show={showViewModal} 
        onHide={() => setShowViewModal(false)} 
        size="lg" centered={window.innerWidth <= 768} style={{ zoom: '0.75' }}
      >
        <Modal.Header closeButton>
          <Modal.Title className="mobile-modal-title">
            <i className="fas fa-user me-2"></i>
            Community Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="mobile-modal-body" style={{ padding: '1rem', maxHeight: '75vh', overflowY: 'auto' }}>
          {selectedOwner && (
            <>
              {/* Owner Information */}
              <Card className="mb-3">
                <Card.Header>
                  <h6 className="mb-0">
                    <i className="fas fa-user-circle me-2"></i>
                    Community Information
                  </h6>
                </Card.Header>
                <Card.Body style={{ padding: '0.75rem' }}>
                  <Row className="g-0">
                    <Col xs={12} md={6}>
                      <Table borderless size="sm">
                        <tbody>
                          <tr>
                            <td style={{ width: '120px' }}><strong>Name:</strong></td>
                            <td>{selectedOwner.po_first_name || selectedOwner.first_name} {selectedOwner.po_last_name || selectedOwner.last_name}</td>
                          </tr>
                          <tr>
                            <td><strong>Username:</strong></td>
                            <td>{selectedOwner.username}</td>
                          </tr>
                          <tr>
                            <td><strong>Address:</strong></td>
                            <td>{selectedOwner.address || 'Not provided'}</td>
                          </tr>
                          <tr>
                            <td><strong>Status:</strong></td>
                            <td>
                              <Badge bg={selectedOwner.is_active ? 'success' : 'secondary'}>
                                {selectedOwner.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                    <Col xs={12} md={6}>
                      <Table borderless size="sm">
                        <tbody>
                          <tr>
                            <td style={{ width: '120px' }}><strong>Email:</strong></td>
                            <td>{selectedOwner.email}</td>
                          </tr>
                          <tr>
                            <td><strong>Phone:</strong></td>
                            <td>{selectedOwner.po_phone || selectedOwner.phone || 'Not provided'}</td>
                          </tr>
                        </tbody>
                      </Table>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Pets List */}
              <h6 className="text-muted mb-3">
                <i className="fas fa-paw me-2"></i>
                Registered Pets ({ownerPets.length})
              </h6>

              {viewLoading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" variant="primary" />
                </div>
              ) : ownerPets.length === 0 ? (
                <Alert variant="info">
                  <i className="fas fa-info-circle me-2"></i>
                  This member hasn't registered any pets yet.
                </Alert>
              ) : (
                <>
                  <div className="table-responsive">
                    <Table bordered hover size="sm">
                      <thead className="table-light">
                        <tr>
                          <th>Pet Name</th>
                          <th>Species/Breed</th>
                          <th>Gender</th>
                          <th>Age</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentPets.map(pet => (
                          <tr key={pet.id}>
                            <td>
                              <div>
                                <strong>{pet.name}</strong>
                                <br />
                                <small className="text-muted">
                                  <i className="fas fa-barcode me-1"></i>
                                  {pet.registration_number || 'N/A'}
                                </small>
                              </div>
                            </td>
                            <td>
                              <span className="text-capitalize" style={{ fontWeight: '500' }}>
                                {pet.species}
                              </span>
                              {pet.breed && (
                                <div className="mt-1">
                                  <small className="text-muted">{pet.breed}</small>
                                </div>
                              )}
                            </td>
                            <td className="text-capitalize">
                              {pet.gender === 'male' ? (
                                <><i className="fas fa-mars text-primary me-1"></i>Male</>
                              ) : (
                                <><i className="fas fa-venus text-danger me-1"></i>Female</>
                              )}
                            </td>
                            <td>{calculateAge(pet.birth_date)}</td>
                            <td>
                              <Badge bg={pet.is_active ? 'success' : 'secondary'}>
                                {pet.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  {modalTotalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={handleModalPrevPage}
                        disabled={modalCurrentPage === 1}
                      >
                        <i className="fas fa-chevron-left me-1"></i>
                        Previous
                      </Button>
                      
                      <span className="text-muted">
                        Page {modalCurrentPage} / {modalTotalPages}
                      </span>
                      
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={handleModalNextPage}
                        disabled={modalCurrentPage === modalTotalPages}
                      >
                        Next
                        <i className="fas fa-chevron-right ms-1"></i>
                      </Button>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowViewModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>


    {/* ══════════ VERIFICATION MODAL ══════════ */}
    {verifOwner && (
      <Modal show={showVerifModal} onHide={() => !verifLoading && setShowVerifModal(false)} size="lg" centered={window.innerWidth <= 768} style={{ zoom: '0.75' }} backdrop="static">
        <Modal.Header closeButton={!verifLoading} style={{ background: 'linear-gradient(135deg,#f8f9fa,#e9ecef)', borderBottom: '2px solid #ffc107', borderRadius: '20px 20px 0 0' }}>
          <Modal.Title className="mobile-verif-title" style={{ fontWeight: '800', color: '#333', fontSize: '1.05rem' }}>
            <i className="fas fa-id-card me-2" style={{ color: '#ffc107' }} />
            Community Verification — {verifOwner.po_first_name || verifOwner.first_name} {verifOwner.po_last_name || verifOwner.last_name}
            <span style={{ marginLeft: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.25rem 0.75rem', borderRadius: '999px', background: (VERIF_CONFIG[verifOwner.verification_status]?.color || '#999') + '18', border: `1.5px solid ${(VERIF_CONFIG[verifOwner.verification_status]?.color || '#999')}40`, fontSize: '0.75rem', fontWeight: '700', color: VERIF_CONFIG[verifOwner.verification_status]?.color || '#999' }}>
              <i className={`fas ${VERIF_CONFIG[verifOwner.verification_status]?.icon || 'fa-circle'}`} style={{ fontSize: '0.7rem' }} />
              {VERIF_CONFIG[verifOwner.verification_status]?.label}
            </span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="mobile-verif-body" style={{ padding: '2rem', maxHeight: '72vh', overflowY: 'auto' }}>
          {verifError && (
            <Alert variant="danger" className="mb-3" style={{ borderRadius: '10px', border: '2px solid rgba(220,53,69,0.25)', background: 'rgba(220,53,69,0.07)', fontSize: '0.875rem' }}>
              <i className="fas fa-exclamation-circle me-2" style={{ color: '#dc3545' }} />{verifError}
            </Alert>
          )}
          {verifSuccess && (
            <Alert variant="success" className="mb-3" style={{ borderRadius: '10px', border: '2px solid rgba(25,135,84,0.25)', background: 'rgba(25,135,84,0.07)', fontSize: '0.875rem' }}>
              <i className="fas fa-check-circle me-2" style={{ color: '#198754' }} />{verifSuccess}
            </Alert>
          )}

          {/* Submitted info */}
          <div style={{ background: '#f8f9fa', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem', border: '1.5px solid #e9ecef' }}>
            <Row>
              <Col md={6} className="mb-2">
                <small style={{ color: '#888', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem' }}>ID Type</small>
                <p className="mb-0" style={{ fontWeight: '600', color: '#333' }}>{verifOwner.valid_id_type || <span className="text-muted">Not provided</span>}</p>
              </Col>
              <Col md={6} className="mb-2">
                <small style={{ color: '#888', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem' }}>Submitted On</small>
                <p className="mb-0" style={{ fontWeight: '600', color: '#333' }}>
                  {verifOwner.id_submitted_at ? new Date(verifOwner.id_submitted_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : <span className="text-muted">—</span>}
                </p>
              </Col>
              <Col md={12} className="mb-2">
                <small style={{ color: '#888', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem' }}>Declared Address</small>
                <p className="mb-0" style={{ fontWeight: '600', color: '#333' }}>{verifOwner.po_address || verifOwner.address || <span className="text-muted">Not provided</span>}</p>
              </Col>
              {verifOwner.verified_at && (
                <Col md={6}>
                  <small style={{ color: '#888', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem' }}>Verified On</small>
                  <p className="mb-0" style={{ fontWeight: '600', color: '#333' }}>
                    {new Date(verifOwner.verified_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </Col>
              )}
            </Row>
          </div>

          {/* ID Images */}
          <Row className="mb-3">
            {[
              { label: 'ID Front', src: verifOwner.valid_id_front },
              { label: 'ID Back', src: verifOwner.valid_id_back },
              { label: 'Selfie with ID', src: verifOwner.selfie_with_id },
            ].map(({ label, src }) => {
              // Normalize the src: if it's a raw base64 string without a data URL
              // prefix, add one. If it already has the prefix, use as-is.
              const imgSrc = (() => {
                if (!src) return null;
                const s = typeof src === 'string' ? src.trim() : '';
                if (!s) return null;
                // Already a full data URL
                if (s.startsWith('data:')) return s;
                // Raw base64 — detect type by magic bytes
                if (s.startsWith('/9j/')) return `data:image/jpeg;base64,${s}`;
                if (s.startsWith('iVBOR')) return `data:image/png;base64,${s}`;
                if (s.startsWith('UklGR')) return `data:image/webp;base64,${s}`;
                // Fallback
                return `data:image/jpeg;base64,${s}`;
              })();
              return (
                <Col md={4} key={label} className="mb-3">
                  <small style={{ color: '#888', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>{label}</small>
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      alt={label}
                      style={{ width: '100%', borderRadius: '10px', border: '2px solid #dee2e6', objectFit: 'cover', maxHeight: '160px', cursor: 'zoom-in', transition: 'all 0.2s', display: 'block' }}
                      onMouseOver={(e) => {
                        e.target.style.filter = 'brightness(0.6)';
                        const parent = e.target.parentElement;
                        let icon = parent.querySelector('.zoom-icon');
                        if (!icon) {
                          icon = document.createElement('div');
                          icon.className = 'zoom-icon';
                          icon.innerHTML = '<i class="fas fa-expand" style="font-size:1.5rem;color:#fff;"></i>';
                          icon.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:2;';
                          parent.style.position = 'relative';
                          parent.appendChild(icon);
                        }
                        icon.style.display = 'flex';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.filter = 'brightness(1)';
                        const icon = e.target.parentElement.querySelector('.zoom-icon');
                        if (icon) icon.style.display = 'none';
                      }}
                      onClick={() => {
                        const overlay = document.createElement('div');
                        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;display:flex;align-items:center;justify-content:center;overflow:hidden;';

                        const img = document.createElement('img');
                        img.src = imgSrc;
                        img.style.cssText = 'max-width:90vw;max-height:90vh;object-fit:contain;border-radius:8px;box-shadow:0 8px 40px rgba(0,0,0,0.5);user-select:none;cursor:grab;transform-origin:center center;';

                        let scale = 1, tx = 0, ty = 0;
                        let dragging = false, startX = 0, startY = 0, baseX = 0, baseY = 0;

                        const applyTransform = (animated) => {
                          img.style.transition = animated ? 'transform 0.2s ease' : 'none';
                          img.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
                        };

                        // scroll wheel zoom
                        overlay.addEventListener('wheel', (e) => {
                          e.preventDefault();
                          scale = Math.min(Math.max(scale + (e.deltaY < 0 ? 0.15 : -0.15), 1), 5);
                          if (scale === 1) { tx = 0; ty = 0; }
                          img.style.cursor = scale > 1 ? 'grab' : 'grab';
                          applyTransform(false);
                        }, { passive: false });

                        // drag to pan
                        img.addEventListener('mousedown', (e) => {
                          if (scale <= 1) return;
                          e.preventDefault();
                          dragging = true;
                          startX = e.clientX;
                          startY = e.clientY;
                          baseX = tx;
                          baseY = ty;
                          img.style.cursor = 'grabbing';
                          img.style.transition = 'none';
                        });

                        const onMove = (e) => {
                          if (!dragging) return;
                          tx = baseX + (e.clientX - startX);
                          ty = baseY + (e.clientY - startY);
                          img.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
                        };

                        const onUp = () => {
                          if (!dragging) return;
                          dragging = false;
                          img.style.cursor = scale > 1 ? 'grab' : 'grab';
                        };

                        window.addEventListener('mousemove', onMove);
                        window.addEventListener('mouseup', onUp);

                        // bottom controls
                        const controls = document.createElement('div');
                        controls.style.cssText = 'position:absolute;bottom:1.25rem;left:50%;transform:translateX(-50%);display:flex;gap:0.5rem;align-items:center;';

                        const btnStyle = 'background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);color:#fff;font-size:0.9rem;width:38px;height:38px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;';

                        const mkBtn = (icon, action) => {
                          const b = document.createElement('button');
                          b.innerHTML = `<i class="fas ${icon}"></i>`;
                          b.style.cssText = btnStyle;
                          b.onmouseover = () => b.style.background = 'rgba(255,255,255,0.3)';
                          b.onmouseout  = () => b.style.background = 'rgba(255,255,255,0.15)';
                          b.onclick = (e) => { e.stopPropagation(); action(); };
                          return b;
                        };

                        controls.appendChild(mkBtn('fa-search-minus', () => {
                          scale = Math.max(scale - 0.3, 1);
                          if (scale === 1) { tx = 0; ty = 0; }
                          applyTransform(true);
                        }));
                        controls.appendChild(mkBtn('fa-compress', () => {
                          scale = 1; tx = 0; ty = 0;
                          applyTransform(true);
                        }));
                        controls.appendChild(mkBtn('fa-search-plus', () => {
                          scale = Math.min(scale + 0.3, 5);
                          applyTransform(true);
                        }));

                        // hint label
                        const hint = document.createElement('div');
                        hint.innerHTML = 'Scroll to zoom &nbsp;·&nbsp; Drag to pan';
                        hint.style.cssText = 'position:absolute;top:1.25rem;left:50%;transform:translateX(-50%);color:rgba(255,255,255,0.45);font-size:0.75rem;pointer-events:none;white-space:nowrap;';

                        const closeBtn = document.createElement('button');
                        closeBtn.innerHTML = '✕';
                        closeBtn.style.cssText = 'position:absolute;top:1rem;right:1rem;background:rgba(255,255,255,0.15);border:2px solid rgba(255,255,255,0.3);color:#fff;font-size:1.2rem;width:42px;height:42px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;z-index:10;';
                        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,255,255,0.3)';
                        closeBtn.onmouseout  = () => closeBtn.style.background = 'rgba(255,255,255,0.15)';
                        closeBtn.onclick = () => {
                          window.removeEventListener('mousemove', onMove);
                          window.removeEventListener('mouseup', onUp);
                          document.body.removeChild(overlay);
                        };

                        overlay.appendChild(img);
                        overlay.appendChild(closeBtn);
                        overlay.appendChild(controls);
                        overlay.appendChild(hint);
                        document.body.appendChild(overlay);
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<div style="width:100%;height:120px;border-radius:10px;border:2px dashed #dee2e6;background:#f8f9fa;display:flex;align-items:center;justify-content:center;color:#aaa;font-size:0.8rem"><i class="fas fa-image"></i>&nbsp;Failed to load</div>';
                      }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '120px', borderRadius: '10px', border: '2px dashed #dee2e6', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: '0.8rem' }}>
                      <i className="fas fa-image me-1" />Not uploaded
                    </div>
                  )}
                </Col>
              );
            })}
          </Row>

          {/* Action buttons for pending status */}
          {verifOwner.verification_status === 'pending' && (
            <div style={{ background: 'rgba(255,193,7,0.06)', border: '1.5px dashed #ffc107', borderRadius: '12px', padding: '1.25rem', marginTop: '0.5rem' }}>
              <p style={{ fontWeight: '700', color: '#333', marginBottom: '1rem', fontSize: '0.95rem' }}>
                <i className="fas fa-gavel me-2" style={{ color: '#ffc107' }} />
                Review Action
              </p>
              <div className="mobile-verif-actions" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <Button onClick={() => handleVerifyAction('semi_verified')} disabled={verifLoading} className="border-0"
                  style={{ background: 'linear-gradient(135deg,#0d6efd,#0a58ca)', color: '#fff', borderRadius: '10px', fontWeight: '700', padding: '0.65rem 1.25rem', fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(13,110,253,0.35)', transition: 'all 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 6px 18px rgba(13,110,253,0.5)'}
                  onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(13,110,253,0.35)'}>
                  {verifLoading ? <Spinner as="span" animation="border" size="sm" className="me-2" /> : <i className="fas fa-shield-alt me-2" />}
                  Semi Verified
                </Button>
                <Button onClick={() => handleVerifyAction('fully_verified')} disabled={verifLoading} className="border-0"
                  style={{ background: 'linear-gradient(135deg,#198754,#146c43)', color: '#fff', borderRadius: '10px', fontWeight: '700', padding: '0.65rem 1.25rem', fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(25,135,84,0.35)', transition: 'all 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 6px 18px rgba(25,135,84,0.5)'}
                  onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(25,135,84,0.35)'}>
                  {verifLoading ? <Spinner as="span" animation="border" size="sm" className="me-2" /> : <i className="fas fa-check-circle me-2" />}
                  Fully Verified
                </Button>
                <Button onClick={() => handleVerifyAction('not_verified')} disabled={verifLoading} className="border-0"
                  style={{ background: 'linear-gradient(135deg,#dc3545,#b02a37)', color: '#fff', borderRadius: '10px', fontWeight: '700', padding: '0.65rem 1.25rem', fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(220,53,69,0.35)', transition: 'all 0.2s' }}
                  onMouseOver={(e) => e.currentTarget.style.boxShadow = '0 6px 18px rgba(220,53,69,0.5)'}
                  onMouseOut={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(220,53,69,0.35)'}>
                  {verifLoading ? <Spinner as="span" animation="border" size="sm" className="me-2" /> : <i className="fas fa-times-circle me-2" />}
                  Decline
                </Button>
              </div>
              <small style={{ color: '#888', marginTop: '0.75rem', display: 'block', fontSize: '0.78rem' }}>
                <i className="fas fa-info-circle me-1" />Declining will reset the member's verification status and erase their submitted request.
              </small>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding: '1.25rem 2rem', borderTop: '1px solid #e9ecef' }}>
          <Button variant="secondary" onClick={() => setShowVerifModal(false)} disabled={verifLoading}
            style={{ borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: '600' }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    )}
    </>
  );
};

export default SuperAdminOwnerManagement;