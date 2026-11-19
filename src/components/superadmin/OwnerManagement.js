import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Modal } from 'react-bootstrap';
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

// Raw base64 or data URL -> usable <img> src
const toImgSrc = (src) => {
  if (!src || typeof src !== 'string') return null;
  const s = src.trim();
  if (!s) return null;
  if (s.startsWith('data:')) return s;
  if (s.startsWith('/9j/')) return `data:image/jpeg;base64,${s}`;   // check before "/" paths
  if (s.startsWith('iVBOR')) return `data:image/png;base64,${s}`;
  if (s.startsWith('UklGR')) return `data:image/webp;base64,${s}`;
  if (s.startsWith('http') || s.startsWith('/')) return s;
  return `data:image/jpeg;base64,${s}`;
};

// Full-screen photo viewer: scroll or buttons to zoom, drag to pan, Esc to close
const IdLightbox = ({ src, label, onClose }) => {
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  const drag = useRef(null);

  useEffect(() => {
    // Capture Esc first so it closes only the photo, not the modal behind it
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  const zoomBy = (d) => setView(v => {
    const scale = Math.min(Math.max(v.scale + d, 1), 5);
    return scale === 1 ? { scale: 1, x: 0, y: 0 } : { ...v, scale };
  });

  return (
    <div className="om-lightbox" onClick={onClose} onWheel={e => zoomBy(e.deltaY < 0 ? 0.15 : -0.15)}
      onMouseMove={e => { if (drag.current) setView(v => ({ ...v, x: drag.current.bx + e.clientX - drag.current.sx, y: drag.current.by + e.clientY - drag.current.sy })); }}
      onMouseUp={() => { drag.current = null; }} onMouseLeave={() => { drag.current = null; }}>
      <div className="om-lb-label">{label} · Scroll to zoom, drag to pan</div>
      <img src={src} alt={label} draggable={false}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => { if (view.scale <= 1) return; e.preventDefault(); drag.current = { sx: e.clientX, sy: e.clientY, bx: view.x, by: view.y }; }}
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, cursor: view.scale > 1 ? 'grab' : 'default', transition: drag.current ? 'none' : 'transform 0.15s ease' }} />
      <button type="button" className="om-lb-btn close" onClick={onClose} aria-label="Close"><i className="fas fa-times" /></button>
      <div className="om-lb-controls" onClick={e => e.stopPropagation()}>
        <button type="button" className="om-lb-btn" onClick={() => zoomBy(-0.3)} aria-label="Zoom out"><i className="fas fa-search-minus" /></button>
        <button type="button" className="om-lb-btn" onClick={() => setView({ scale: 1, x: 0, y: 0 })} aria-label="Reset zoom"><i className="fas fa-compress" /></button>
        <button type="button" className="om-lb-btn" onClick={() => zoomBy(0.3)} aria-label="Zoom in"><i className="fas fa-search-plus" /></button>
      </div>
    </div>
  );
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
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [lightbox, setLightbox] = useState(null);

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
    .cm-avatar { width: 32px; height: 32px; border-radius: 50%; background: rgba(255,193,7,0.18); color: #8a6700; display: flex; align-items: center; justify-content: center; font-size: 0.68rem; font-weight: 800; flex-shrink: 0; }
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
    /* ---------- Alerts ---------- */
    .om-alert { display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.75rem 1rem; margin-bottom: 1.1rem; border-radius: 12px; font-size: 0.88rem; font-weight: 500; }
    .om-alert i { margin-top: 3px; }
    .om-alert span { flex: 1; }
    .om-alert.danger { background: rgba(220,53,69,0.07); border: 1px solid rgba(220,53,69,0.25); color: #b02a37; }
    .om-alert.success { background: rgba(25,135,84,0.07); border: 1px solid rgba(25,135,84,0.25); color: #146c43; }
    .om-alert button { border: none; background: transparent; color: inherit; width: 28px; height: 28px; margin: -4px -4px -4px 0; border-radius: 7px; opacity: 0.7; }
    .om-alert button:hover { opacity: 1; background: rgba(0,0,0,0.05); }

    /* ---------- Laptops with the sidebar (769–1199px) ---------- */
    @media (min-width: 769px) and (max-width: 1199.98px) {
      .cm-table th:nth-child(5), .cm-table td:nth-child(5) { display: none; }
      .cm-table th:nth-child(1) { width: 30% !important; }
      .cm-table th:nth-child(2) { width: 33% !important; }
      .cm-table th:nth-child(3) { width: 9% !important; }
      .cm-table th:nth-child(4) { width: 21% !important; }
      .mobile-card-padding { padding: 1.1rem !important; }
      .mobile-stat-number { font-size: 2.2rem !important; }
    }

    /* ---------- Modals: top on desktop, centered on phones ---------- */
    .om-zoom-modal { zoom: 0.75; }
    @media (min-width: 1600px) { .om-zoom-modal { zoom: 0.9; } }
    @media (min-width: 1920px) { .om-zoom-modal { zoom: 1; } }
    @media (max-width: 768px) {
      .om-zoom-modal { zoom: 1; }
      .om-zoom-modal .modal-dialog { margin: 0.75rem auto; max-width: calc(100% - 1.5rem); display: flex; align-items: center; min-height: calc(100% - 1.5rem); }
      .om-zoom-modal .modal-dialog-scrollable { height: calc(100% - 1.5rem); }
    }
    .om-backdrop-top { z-index: 1060 !important; }
    .om-modal { max-width: 720px; }
    .om-modal.lg { max-width: 860px; }
    .om-modal .modal-content, .omc-modal .modal-content { border: none; border-radius: 16px; overflow: hidden; box-shadow: 0 24px 60px rgba(16,24,40,0.2); }
    .om-head { align-items: flex-start !important; padding: 1.25rem 1.5rem !important; border-bottom: 1px solid #eef0f3 !important; background: linear-gradient(180deg, #fffaeb 0%, #fff 100%); }
    .om-head-main { display: flex; gap: 0.95rem; align-items: center; min-width: 0; flex: 1; }
    .om-avatar { width: 56px; height: 56px; border-radius: 16px; flex-shrink: 0; background: linear-gradient(135deg, #ffc107, #ffb000); color: #1f2328; font-weight: 800; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(255,193,7,0.3); }
    .om-head-ic { width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0; background: rgba(255,193,7,0.18); color: #b88a00; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; }
    .om-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.3rem; }
    .om-chip { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; font-weight: 700; padding: 0.18rem 0.6rem; border-radius: 999px; white-space: nowrap; }
    .om-chip i { font-size: 0.66rem; }
    .om-chip.green { background: rgba(25,135,84,0.12); color: #198754; }
    .om-chip.grey { background: #f3f4f6; color: #6b7280; }
    .om-title { font-size: 1.25rem; font-weight: 700; color: #1f2328; margin: 0; line-height: 1.25; word-break: break-word; }
    .om-sub { font-size: 0.8rem; color: #6b7280; margin-top: 0.15rem; font-weight: 600; }
    .om-body { padding: 1.4rem 1.5rem !important; }
    .om-section-title { display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 0.75rem; }
    .om-section-title > i { color: #e0a800; font-size: 0.8rem; }
    .om-count { font-size: 0.7rem; background: #1f2328; color: #fff; padding: 0.05rem 0.5rem; border-radius: 999px; letter-spacing: 0; }
    .om-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
    .om-info { display: flex; gap: 0.65rem; align-items: flex-start; padding: 0.7rem 0.8rem; border: 1px solid #eef0f3; border-radius: 12px; background: #fafbfc; min-width: 0; }
    .om-info.wide { grid-column: 1 / -1; }
    .om-info-ic { width: 30px; height: 30px; border-radius: 9px; background: #fff; border: 1px solid #eef0f3; color: #9ca3af; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; flex-shrink: 0; }
    .om-info-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
    .om-info-value { font-size: 0.9rem; font-weight: 600; color: #1f2328; word-break: break-word; }
    .om-pets { border: 1px solid #eef0f3; border-radius: 12px; overflow: hidden; }
    .om-pet { display: flex; align-items: center; gap: 0.75rem; padding: 0.7rem 0.9rem; border-bottom: 1px solid #f3f4f6; }
    .om-pet:last-child { border-bottom: none; }
    .om-pet-ic { width: 38px; height: 38px; border-radius: 10px; background: rgba(255,193,7,0.14); color: #e0a800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .om-pet-name { font-weight: 700; font-size: 0.92rem; color: #1f2328; }
    .om-pet-meta { font-size: 0.78rem; color: #6b7280; display: flex; flex-wrap: wrap; align-items: center; gap: 0 0.1rem; }
    .om-pet-meta .dot { margin: 0 0.35rem; color: #c4c9d0; }
    .om-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .om-pager { display: flex; align-items: center; justify-content: space-between; margin-top: 0.75rem; font-size: 0.82rem; }
    .om-empty { display: flex; align-items: center; gap: 0.5rem; padding: 1.1rem; border: 1px dashed #e5e7eb; border-radius: 12px; color: #9ca3af; font-size: 0.86rem; }
    .om-ids { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; }
    .om-id { position: relative; display: block; width: 100%; height: 150px; padding: 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background: #f8f9fa; cursor: zoom-in; }
    .om-id img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform 0.25s ease; }
    .om-id:hover img { transform: scale(1.04); }
    .om-id-zoom { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0); color: transparent; font-size: 1.3rem; transition: all 0.15s ease; }
    .om-id:hover .om-id-zoom, .om-id:focus-visible .om-id-zoom { background: rgba(0,0,0,0.35); color: #fff; }
    .om-id.broken::after { content: 'Failed to load'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: #9ca3af; }
    .om-id-none { height: 150px; border: 1.5px dashed #e5e7eb; border-radius: 12px; background: #fafbfc; display: flex; align-items: center; justify-content: center; gap: 0.4rem; color: #9ca3af; font-size: 0.82rem; }
    .om-review { margin-top: 1.4rem; padding: 1.1rem 1.2rem; border-radius: 14px; background: rgba(255,193,7,0.07); border: 1px solid rgba(255,193,7,0.4); }
    .om-review-title { font-weight: 700; color: #1f2328; display: flex; align-items: center; gap: 0.5rem; }
    .om-review-title i { color: #e0a800; }
    .om-review-text { font-size: 0.84rem; color: #6b7280; margin: 0.3rem 0 0.9rem; }
    .om-review-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .om-review-actions .om-btn { flex: 1 1 150px; }
    .om-foot { padding: 0.9rem 1.5rem !important; border-top: 1px solid #eef0f3 !important; display: flex; justify-content: flex-end; gap: 0.6rem; }
    .om-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; border-radius: 10px; border: 1px solid transparent; font-weight: 600; font-size: 0.88rem; padding: 0.6rem 1.15rem; white-space: nowrap; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
    .om-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .om-btn.primary { background: #ffc107; color: #1f2328; min-width: 110px; }
    .om-btn.primary:hover:not(:disabled) { background: #f0b400; box-shadow: 0 6px 16px rgba(255,193,7,0.35); }
    .om-btn.ghost { background: #fff; color: #1f2328; border-color: #e5e7eb; }
    .om-btn.ghost:hover:not(:disabled) { background: #fff8e1; border-color: #ffc107; }
    .om-btn.blue { background: #0d6efd; color: #fff; }
    .om-btn.blue:hover:not(:disabled) { background: #0b5ed7; box-shadow: 0 6px 16px rgba(13,110,253,0.25); }
    .om-btn.green { background: #198754; color: #fff; }
    .om-btn.green:hover:not(:disabled) { background: #157347; box-shadow: 0 6px 16px rgba(25,135,84,0.25); }
    .om-btn.danger { background: #dc3545; color: #fff; }
    .om-btn.danger:hover:not(:disabled) { background: #bb2d3b; }
    .om-btn.danger-outline { background: #fff; color: #dc3545; border-color: rgba(220,53,69,0.35); }
    .om-btn.danger-outline:hover:not(:disabled) { background: rgba(220,53,69,0.06); }
    .om-btn:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    /* Small confirm modal */
    .omc-modal { max-width: 420px; }
    @keyframes omcPop { 0% { transform: scale(0.7); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
    .omc-body { padding: 1.75rem 1.6rem 1.2rem !important; text-align: center; }
    .omc-icon { width: 58px; height: 58px; border-radius: 16px; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.45rem; color: #dc3545; background: rgba(220,53,69,0.1); animation: omcPop 0.4s ease-out; }
    .omc-title { font-weight: 700; color: #1f2328; margin-bottom: 0.35rem; font-size: 1.15rem; }
    .omc-text { font-size: 0.88rem; color: #6b7280; margin: 0; line-height: 1.55; }
    .omc-foot { border-top: 1px solid #eef0f3 !important; padding: 0.9rem 1.4rem !important; gap: 0.6rem; flex-wrap: nowrap !important; }
    .omc-foot .om-btn { flex: 1; margin: 0; }

    /* Lightbox */
    .om-lightbox { position: fixed; inset: 0; z-index: 100000; background: rgba(0,0,0,0.92); display: flex; align-items: center; justify-content: center; overflow: hidden; }
    .om-lightbox img { max-width: 90vw; max-height: 86vh; object-fit: contain; border-radius: 10px; box-shadow: 0 8px 40px rgba(0,0,0,0.5); user-select: none; }
    .om-lb-label { position: absolute; top: 1.25rem; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.6); font-size: 0.8rem; white-space: nowrap; pointer-events: none; }
    .om-lb-btn { width: 42px; height: 42px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.15); color: #fff; display: flex; align-items: center; justify-content: center; transition: background 0.15s ease; }
    .om-lb-btn:hover { background: rgba(255,255,255,0.3); }
    .om-lb-btn.close { position: absolute; top: 1rem; right: 1rem; }
    .om-lb-controls { position: absolute; bottom: 1.25rem; left: 50%; transform: translateX(-50%); display: flex; gap: 0.5rem; }

    @media (max-width: 768px) {
      .om-head { padding: 1rem !important; }
      .om-avatar { width: 46px; height: 46px; font-size: 1rem; border-radius: 13px; }
      .om-body { padding: 1rem !important; }
      .om-info-grid { grid-template-columns: 1fr; }
      .om-info-ic { display: none; }
      .om-ids { grid-template-columns: 1fr 1fr; }
      .om-foot { padding: 0.75rem 1rem !important; }
      .om-foot .om-btn { flex: 1; }
      .om-foot .me-auto { margin-right: 0 !important; }
    }
    @media (prefers-reduced-motion: reduce) { .omc-icon { animation: none; } }
  `;

  const CACHE_TTL = 60_000;

  const loadPage = async (page, force = false, silent = false) => {
    const cacheKey = `${page}`;
    const cached = pageCache[cacheKey];
    if (!force && cached && Date.now() - cached.ts < CACHE_TTL) {
      setOwners(cached.owners);
      setTotalOwners(cached.total);
      return;
    }

    if (!silent) page === 1 ? setLoading(true) : setPageLoading(true);
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
    setShowDeclineConfirm(false);
    setShowVerifModal(true);
    setShowDropdown(null);
    // Fetch single owner to get full image fields
    try {
      const res = await ownerAPI.getByUserId(owner.user_id);
      const fresh = res.data.owner;
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
      await loadPage(currentPage, true, true);   // silent: no skeleton, no jump
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
          <div role="alert" className="om-alert danger">
            <i className="fas fa-exclamation-circle" /><span>{error}</span>
            <button type="button" onClick={() => setError('')} aria-label="Dismiss"><i className="fas fa-times" /></button>
          </div>
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
          <Col xs={4} className="mb-3" key={label} style={{ animation: `dropDown 0.4s ease-out ${delay} backwards` }}>
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

      {/* ======================== VIEW COMMUNITY MODAL ======================== */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} dialogClassName="om-modal" className="om-zoom-modal" scrollable>
        {selectedOwner && (() => {
          const o = selectedOwner;
          const first = o.po_first_name || o.first_name || '';
          const last = o.po_last_name || o.last_name || '';
          const initials = `${first[0] || ''}${last[0] || ''}`.toUpperCase() || '?';
          const verif = VERIF_CONFIG[o.verification_status] || VERIF_CONFIG.not_verified;
          const login = lastLoginInfo(o.last_login);
          const info = [
            { icon: 'fa-at', label: 'Username', value: o.username || '—' },
            { icon: 'fa-venus-mars', label: 'Gender', value: <span className="text-capitalize">{o.gender || 'Not provided'}</span> },
            { icon: 'fa-envelope', label: 'Email', value: o.email || 'Not provided' },
            { icon: 'fa-phone-alt', label: 'Phone', value: o.po_phone || o.phone || 'Not provided' },
            { icon: 'fa-home', label: 'Address', value: o.po_address || o.address || 'Not provided', wide: true },
          ];
          return (
            <>
              <Modal.Header closeButton className="om-head">
                <div className="om-head-main">
                  <div className="om-avatar">{initials}</div>
                  <div style={{ minWidth: 0 }}>
                    <div className="om-chips">
                      <span className={`om-chip ${o.is_active ? 'green' : 'grey'}`}><i className="fas fa-circle" style={{ fontSize: '0.45rem' }} />{o.is_active ? 'Active' : 'Inactive'}</span>
                      <span className="om-chip" style={{ color: verif.color, background: `color-mix(in srgb, ${verif.color} 12%, #fff)` }}><i className={`fas ${verif.icon}`} />{verif.label}</span>
                    </div>
                    <Modal.Title as="h5" className="om-title">{first} {last}</Modal.Title>
                    <div className="om-sub" style={{ color: login.color }}><i className="fas fa-clock me-1" />{login.label}</div>
                  </div>
                </div>
              </Modal.Header>
              <Modal.Body className="om-body">
                <div className="om-section-title"><i className="fas fa-user-circle" />Personal information</div>
                <div className="om-info-grid">
                  {info.map(it => (
                    <div key={it.label} className={`om-info${it.wide ? ' wide' : ''}`}>
                      <div className="om-info-ic"><i className={`fas ${it.icon}`} /></div>
                      <div style={{ minWidth: 0 }}>
                        <div className="om-info-label">{it.label}</div>
                        <div className="om-info-value">{it.value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="om-section-title mt-4">
                  <i className="fas fa-paw" />Registered pets
                  {!viewLoading && <span className="om-count">{ownerPets.length}</span>}
                </div>
                {viewLoading ? (
                  <div className="om-pets">
                    {Array.from({ length: 3 }, (_, i) => (
                      <div key={i} className="om-pet" style={{ opacity: 1 - i * 0.2 }}>
                        <div className="skeleton" style={{ width: 38, height: 38, borderRadius: 10 }} />
                        <div className="flex-grow-1">
                          <div className="skeleton" style={{ width: '35%', height: 12, marginBottom: 7 }} />
                          <div className="skeleton" style={{ width: '22%', height: 10 }} />
                        </div>
                        <div className="skeleton" style={{ width: 60, height: 20, borderRadius: 999 }} />
                      </div>
                    ))}
                  </div>
                ) : ownerPets.length === 0 ? (
                  <div className="om-empty"><i className="fas fa-paw" />This member hasn't registered any pets yet.</div>
                ) : (
                  <>
                    <div className="om-pets">
                      {currentPets.map(pet => (
                        <div key={pet.id} className="om-pet">
                          <div className="om-pet-ic"><i className="fas fa-paw" /></div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div className="om-pet-name">{pet.name}</div>
                            <div className="om-pet-meta">
                              <span className="om-mono">{pet.registration_number || 'N/A'}</span>
                              <span className="dot">·</span>
                              <span className="text-capitalize">{pet.species}</span>{pet.breed && <> ({pet.breed})</>}
                              <span className="dot">·</span>
                              {pet.gender === 'male'
                                ? <span><i className="fas fa-mars" style={{ color: '#0d6efd' }} /> Male</span>
                                : <span><i className="fas fa-venus" style={{ color: '#d63384' }} /> Female</span>}
                              <span className="dot">·</span>
                              <span>{calculateAge(pet.birth_date)}</span>
                            </div>
                          </div>
                          <span className={`om-chip ${pet.is_active ? 'green' : 'grey'}`}>{pet.is_active ? 'Active' : 'Archived'}</span>
                        </div>
                      ))}
                    </div>
                    {modalTotalPages > 1 && (
                      <div className="om-pager">
                        <span className="cm-muted">Page <strong style={{ color: '#1f2328' }}>{modalCurrentPage}</strong> of {modalTotalPages}</span>
                        <div className="d-flex gap-1">
                          <button type="button" className="cm-page nav" onClick={handleModalPrevPage} disabled={modalCurrentPage === 1} aria-label="Previous pets"><i className="fas fa-chevron-left" /></button>
                          <button type="button" className="cm-page nav" onClick={handleModalNextPage} disabled={modalCurrentPage === modalTotalPages} aria-label="Next pets"><i className="fas fa-chevron-right" /></button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </Modal.Body>
              <Modal.Footer className="om-foot">
                {o.verification_status && o.verification_status !== 'not_verified' && (
                  <button type="button" className="om-btn ghost me-auto" onClick={() => { setShowViewModal(false); handleOpenVerifModal(o); }}>
                    <i className="fas fa-id-card" />{o.verification_status === 'pending' ? 'Review ID verification' : 'View ID verification'}
                  </button>
                )}
                <button type="button" className="om-btn primary" onClick={() => setShowViewModal(false)}>Close</button>
              </Modal.Footer>
            </>
          );
        })()}
      </Modal>
    </Container>

    {/* ======================== ID VERIFICATION MODAL ======================== */}
    <Modal show={showVerifModal && !!verifOwner} onHide={() => !verifLoading && setShowVerifModal(false)} backdrop="static" dialogClassName="om-modal lg" className="om-zoom-modal" scrollable>
      {verifOwner && (() => {
        const v = verifOwner;
        const verif = VERIF_CONFIG[v.verification_status] || VERIF_CONFIG.not_verified;
        const fmt = (d) => d ? new Date(String(d).replace(' ', 'T')).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
        const info = [
          { icon: 'fa-id-badge', label: 'ID type', value: v.valid_id_type || 'Not provided' },
          { icon: 'fa-calendar-check', label: 'Submitted on', value: fmt(v.id_submitted_at) || '—' },
          { icon: 'fa-home', label: 'Declared address', value: v.po_address || v.address || 'Not provided', wide: true },
          v.verified_at && { icon: 'fa-shield-alt', label: 'Verified on', value: fmt(v.verified_at) },
        ].filter(Boolean);
        const images = [
          { label: 'ID front', src: toImgSrc(v.valid_id_front) },
          { label: 'ID back', src: toImgSrc(v.valid_id_back) },
          { label: 'Selfie with ID', src: toImgSrc(v.selfie_with_id) },
        ];
        return (
          <>
            <Modal.Header closeButton={!verifLoading} className="om-head">
              <div className="om-head-main">
                <div className="om-head-ic"><i className="fas fa-id-card" /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="om-chips">
                    <span className="om-chip" style={{ color: verif.color, background: `color-mix(in srgb, ${verif.color} 12%, #fff)` }}><i className={`fas ${verif.icon}`} />{verif.label}</span>
                  </div>
                  <Modal.Title as="h5" className="om-title">{v.po_first_name || v.first_name} {v.po_last_name || v.last_name}</Modal.Title>
                  <div className="om-sub">ID verification</div>
                </div>
              </div>
            </Modal.Header>
            <Modal.Body className="om-body">
              {verifError && <div className="om-alert danger"><i className="fas fa-exclamation-circle" /><span>{verifError}</span></div>}
              {verifSuccess && <div className="om-alert success"><i className="fas fa-check-circle" /><span>{verifSuccess}</span></div>}

              <div className="om-section-title"><i className="fas fa-file-alt" />Submitted details</div>
              <div className="om-info-grid">
                {info.map(it => (
                  <div key={it.label} className={`om-info${it.wide ? ' wide' : ''}`}>
                    <div className="om-info-ic"><i className={`fas ${it.icon}`} /></div>
                    <div style={{ minWidth: 0 }}>
                      <div className="om-info-label">{it.label}</div>
                      <div className="om-info-value">{it.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="om-section-title mt-4"><i className="fas fa-images" />Uploaded photos</div>
              <div className="om-ids">
                {images.map(({ label, src }) => (
                  <div key={label}>
                    <div className="om-info-label mb-1">{label}</div>
                    {src ? (
                      <button type="button" className="om-id" onClick={() => setLightbox({ src, label })} aria-label={`Open ${label}`}>
                        <img src={src} alt={label}
                          onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.classList.add('broken'); }} />
                        <span className="om-id-zoom"><i className="fas fa-search-plus" /></span>
                      </button>
                    ) : (
                      <div className="om-id-none"><i className="fas fa-image" />Not uploaded</div>
                    )}
                  </div>
                ))}
              </div>

              {v.verification_status === 'pending' && (
                <div className="om-review">
                  <div className="om-review-title"><i className="fas fa-gavel" />Review decision</div>
                  <p className="om-review-text">Check that the photos are clear, the selfie matches the ID, and the details match the account.</p>
                  <div className="om-review-actions">
                    <button type="button" className="om-btn blue" onClick={() => handleVerifyAction('semi_verified')} disabled={verifLoading}>
                      {verifLoading ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-shield-alt" />}Semi verified
                    </button>
                    <button type="button" className="om-btn green" onClick={() => handleVerifyAction('fully_verified')} disabled={verifLoading}>
                      {verifLoading ? <i className="fas fa-circle-notch fa-spin" /> : <i className="fas fa-check-circle" />}Fully verified
                    </button>
                    <button type="button" className="om-btn danger-outline" onClick={() => setShowDeclineConfirm(true)} disabled={verifLoading}>
                      <i className="fas fa-times-circle" />Decline
                    </button>
                  </div>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer className="om-foot">
              <button type="button" className="om-btn primary" onClick={() => setShowVerifModal(false)} disabled={verifLoading}>Close</button>
            </Modal.Footer>
          </>
        );
      })()}
    </Modal>

    {/* ======================== DECLINE CONFIRM (small, centered) ======================== */}
    <Modal show={showDeclineConfirm} onHide={() => !verifLoading && setShowDeclineConfirm(false)} centered dialogClassName="omc-modal" className="om-zoom-modal" style={{ zIndex: 1065 }} backdropClassName="om-backdrop-top">
      <Modal.Body className="omc-body">
        <div className="omc-icon"><i className="fas fa-times-circle" /></div>
        <h5 className="omc-title">Decline this verification?</h5>
        <p className="omc-text">
          {verifOwner ? `${verifOwner.po_first_name || verifOwner.first_name || ''} ${verifOwner.po_last_name || verifOwner.last_name || ''}`.trim() : 'This member'}'s
          status goes back to Not Verified and their submitted ID is erased. They can submit a new one.
        </p>
      </Modal.Body>
      <Modal.Footer className="omc-foot">
        <button type="button" className="om-btn ghost" onClick={() => setShowDeclineConfirm(false)} disabled={verifLoading}>Cancel</button>
        <button type="button" className="om-btn danger" disabled={verifLoading}
          onClick={async () => { await handleVerifyAction('not_verified'); setShowDeclineConfirm(false); }}>
          {verifLoading ? <><i className="fas fa-circle-notch fa-spin" />Declining…</> : <><i className="fas fa-times-circle" />Decline</>}
        </button>
      </Modal.Footer>
    </Modal>

    {/* ======================== ID PHOTO LIGHTBOX ======================== */}
    {lightbox && <IdLightbox src={lightbox.src} label={lightbox.label} onClose={() => setLightbox(null)} />}
    </>
  );
};

export default SuperAdminOwnerManagement;