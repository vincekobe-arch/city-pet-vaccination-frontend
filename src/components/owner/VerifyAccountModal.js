import React, { useState, useEffect, useRef } from 'react';
import { Modal, Form, Row, Col, Spinner } from 'react-bootstrap';
import { getMunicipalitiesByProvince, getBarangaysByMunicipality, getAllProvinces, getAllRegions } from '@aivangogh/ph-address';
import api from '../../services/api';
import { getUser } from '../../utils/auth';

const ownerAPI = {
  getByUserId: (userId) => api.get(`/owners/user/${userId}`),
  update:      (id, data) => api.put(`/owners/${id}`, data),
  submitId:    (userId, formData) => api.post(`/owners/${userId}/submit-id`, formData, {
    headers: { 'Content-Type': 'application/json' }
  }),
  scanId: (formData) => api.post('/owners/scan-id', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
//  Draft saving — keeps the modal open and the filled-in data (including the
//  uploaded ID photos) when the page is reloaded. Photos are stored in IndexedDB
//  (sessionStorage is too small for images). Drafts expire after 24 hours.
// ─────────────────────────────────────────────────────────────────────────────
const DRAFT_TTL = 24 * 60 * 60 * 1000;
const openKey  = () => `va_open_${getUser()?.id || 'me'}`;
const draftKey = () => `va_draft_${getUser()?.id || 'me'}`;

const idbRun = (mode, fn) => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') { reject(new Error('no indexedDB')); return; }
  const open = indexedDB.open('petunity-verify', 1);
  open.onupgradeneeded = () => open.result.createObjectStore('drafts');
  open.onerror = () => reject(open.error);
  open.onsuccess = () => {
    const db = open.result;
    const tx = db.transaction('drafts', mode);
    const req = fn(tx.objectStore('drafts'));
    tx.oncomplete = () => { db.close(); resolve(req ? req.result : undefined); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  };
});
const draftGet = () => idbRun('readonly', st => st.get(draftKey())).catch(() => null);
const draftSet = (value) => idbRun('readwrite', st => st.put(value, draftKey())).catch(() => {});
const draftDel = () => idbRun('readwrite', st => st.delete(draftKey())).catch(() => {});

/** True when the verify modal was open before the page was reloaded (used by the Sidebar to reopen it). */
export const isVerifyModalPending = () => {
  try { return sessionStorage.getItem(openKey()) === '1'; } catch { return false; }
};
const setPending = (on) => {
  try { if (on) sessionStorage.setItem(openKey(), '1'); else sessionStorage.removeItem(openKey()); } catch { /* storage blocked */ }
};

// ID scanning now happens server-side (see ownerAPI.scanId) — no client-side API key needed.

const VALID_ID_TYPES = [
  "Muntinlupa Care Card", "Philippine Passport", "Driver's License", "SSS ID", "GSIS ID",
  "PhilHealth ID", "Pag-IBIG ID", "Voter's ID", "Postal ID",
  "National ID (PhilSys)", "PRC ID", "Senior Citizen ID", "PWD ID",
  "Barangay ID", "Company ID", "Other"
];

// ─────────────────────────────────────────────────────────────────────────────
//  Address-matching helpers
// ─────────────────────────────────────────────────────────────────────────────
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// lowercase, strip accents (ñ → n), punctuation → spaces, collapse whitespace
const norm = (s) => (s || '').toString()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const NOISE_WORDS = /\b(city of|municipality of|city|municipality|barangay|brgy|brg)\b/g;

// Every way a place name may be written on an ID:
//  "Muntinlupa City"        → ["muntinlupa city", "muntinlupa"]
//  "City of San Pedro"      → ["city of san pedro", "san pedro"]
//  "Barangay 1 (Poblacion)" → [..., "poblacion"]
const placeAliases = (name) => {
  const raw = (name || '').toString();
  const variants = [raw, raw.replace(/\(.*?\)/g, ' ')];
  (raw.match(/\((.*?)\)/g) || []).forEach(p => variants.push(p.replace(/[()]/g, '')));
  const out = new Set();
  variants.forEach(v => {
    const n = norm(v);
    if (!n) return;
    out.add(n);
    const stripped = n.replace(NOISE_WORDS, ' ').replace(/\s+/g, ' ').trim();
    if (stripped) out.add(stripped);
  });
  return [...out];
};

// Skip pure-number aliases (e.g. "1") so they can't collide with house numbers
const searchable = (a) => /[a-z]{3,}/.test(a);

// Position of the LAST whole-word occurrence of `needle` in normalized `text` (-1 if none)
const lastIndexOfWord = (text, needle) => ` ${text} `.lastIndexOf(` ${needle} `);

// Best place from a list found inside free text.
// PH addresses run street → barangay → city → province, so the match that appears
// LATEST wins (then the longest name). This is what stops "59 Rizal St." beating "San Pedro".
const bestPlaceInText = (places, text) => {
  let best = null;
  places.forEach(place => {
    placeAliases(place.name).filter(searchable).forEach(alias => {
      const pos = lastIndexOfWord(text, alias);
      if (pos < 0) return;
      const end = pos + alias.length;
      if (!best || end > best.end || (end === best.end && alias.length > best.len)) {
        best = { place, end, len: alias.length };
      }
    });
  });
  return best ? best.place : null;
};

// Is this city/place mentioned on the ID? ("Muntinlupa City" matches an ID that just says "MUNTINLUPA")
const foundOnId = (placeName, ocrText) => {
  const hay = ` ${norm(ocrText)} `;
  return placeAliases(placeName).filter(searchable).some(a => hay.includes(` ${a} `));
};

const findBarangay = (barangays, text, partBarangay, cityName) => {
  // 1) trust the AI-extracted barangay if it matches the dataset
  if (partBarangay) {
    const wanted = placeAliases(partBarangay);
    const hit = barangays.find(b => placeAliases(b.name).some(a => wanted.includes(a)));
    if (hit) return hit;
  }
  // 2) otherwise search the address text — barangay sits BEFORE the city, so look there first
  const cityPos = Math.max(-1, ...placeAliases(cityName).filter(searchable).map(a => lastIndexOfWord(text, a)));
  const before = cityPos > 0 ? text.slice(0, cityPos) : text;
  return bestPlaceInText(barangays, before) || bestPlaceInText(barangays, text);
};

const toTitleCase = (s) => (s || '').toLowerCase().replace(/(^|[\s-])([a-z])/g, (_, a, b) => a + b.toUpperCase());
const prettify    = (s) => (s && s === s.toUpperCase() ? toTitleCase(s) : s);

// "+63 912 345 6789" / "0912-345-6789" / "9123456789" → "9123456789"; anything else → ''
const normalizePhoneFromId = (raw) => {
  let d = (raw || '').toString().replace(/\D/g, '');
  if (d.startsWith('63')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  return /^9\d{9}$/.test(d) ? d : '';
};

// last whole-word match of `alias` inside the original (accent-folded) string, -1 if none
const findLastInText = (folded, alias) => {
  const re = new RegExp('(^|[^A-Za-z0-9])(' + alias.split(' ').map(escapeRegex).join('[^A-Za-z0-9]+') + ')(?![A-Za-z0-9])', 'gi');
  let idx = -1, m;
  while ((m = re.exec(folded)) !== null) idx = m.index + m[1].length;
  return idx;
};

// "59", "12-A", "Blk 5 Lot 3", "#45" at the very start of the address
const HOUSE_RE = /^\s*((?:(?:blk|block|lot|phase|ph|unit)\.?\s*)?#?\d+[A-Za-z]?(?![A-Za-z])(?:[-/][0-9A-Za-z]+)?(?:[\s,]+(?:blk|block|lot|phase|ph|unit)\.?\s*#?\d+[A-Za-z]?(?![A-Za-z]))*)/i;

// House no. + street: use the AI's split if present, otherwise parse the raw address
const extractHouseAndStreet = (addressText, parts = {}, loc = null) => {
  let house_no = (parts.house_no || '').toString().trim();
  let street   = (parts.street   || '').toString().trim();

  if (!house_no && !street && addressText) {
    const original = addressText.normalize('NFC');
    const folded   = original.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const m = original.match(HOUSE_RE);
    const start = m ? m[0].length : 0;
    if (m) house_no = m[1].trim();

    // street = text between the house number and the barangay (or city if no barangay matched)
    const lastPos = (name) => Math.max(-1, ...placeAliases(name).filter(searchable).map(a => findLastInText(folded, a)));
    let end = -1;
    if (loc?.barangay) end = lastPos(loc.barangay.name);
    if (end < start && loc?.city) end = lastPos(loc.city.name);
    if (end < start) end = original.indexOf(',', start);

    if (end >= start) {
      street = original.slice(start, end)
        .replace(/[\s,.-]*\b(?:brgy|brg|bgy|barangay)\.?\s*$/i, '')
        .replace(/^[\s,.-]+|[\s,-]+$/g, '');
    }
  }
  return { house_no, street: prettify(street) };
};

const WaveDots = ({ color = '#000000' }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '1rem' }}>
    <style>{`
      @keyframes waveDots {
        0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
        30% { transform: translateY(-6px); opacity: 1; }
      }
    `}</style>
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0s' }} />
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0.15s' }} />
    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, display: 'inline-block', animation: 'waveDots 1.2s ease-in-out infinite', animationDelay: '0.3s' }} />
  </span>
);

// Styles for the verification modals (kept here so the component works on any page)
const VA_STYLES = `
  /* The verification modal fills almost the whole screen */
  .va-zoom-modal { zoom: 1; }
  .va-zoom-modal.va-big .modal-dialog.va-modal { max-width: min(1180px, calc(100vw - 3rem)); width: 100%; height: calc(100vh - 3rem); margin: 1.5rem auto; }
  .va-zoom-modal.va-big .va-modal .modal-content { height: 100%; max-height: 100%; }
  .va-zoom-modal.va-big .va-body { padding: 1.75rem 2rem !important; }
  .va-zoom-modal.va-big .va-head { padding: 1.4rem 2rem !important; }
  .va-zoom-modal.va-big .va-steps { padding: 0 2rem 1.1rem; }
  .va-zoom-modal.va-big .va-foot { padding: 1rem 2rem !important; }
  .va-zoom-modal.va-big .va-drop { min-height: 260px; }
  .va-zoom-modal.va-big .va-drop img { max-height: 230px; }
  .va-modal { max-width: 760px; }
  .va-small { max-width: 430px; }
  .va-modal .modal-content, .va-small .modal-content { border: none; border-radius: 16px; overflow: hidden; box-shadow: 0 24px 60px rgba(16,24,40,0.2); }
  .va-head { align-items: flex-start !important; padding: 1.25rem 1.5rem !important; border-bottom: none !important; background: linear-gradient(180deg, #fffaeb 0%, #fff 100%); }
  .va-head-main { display: flex; gap: 0.9rem; align-items: center; min-width: 0; flex: 1; }
  .va-head-ic { width: 48px; height: 48px; border-radius: 13px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1.15rem; color: #b88a00; background: rgba(255,193,7,0.18); }
  .va-kicker { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #b88a00; }
  .va-title { font-size: 1.2rem; font-weight: 700; color: #1f2328; margin: 0; }
  .va-steps { display: flex; align-items: center; gap: 0.6rem; padding: 0 1.5rem 1rem; border-bottom: 1px solid #eef0f3; background: #fff; }
  .va-step { display: flex; align-items: center; gap: 0.45rem; font-size: 0.8rem; font-weight: 600; color: #9ca3af; white-space: nowrap; }
  .va-step span { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; font-weight: 800; background: #f3f4f6; color: #9ca3af; }
  .va-step.on { color: #1f2328; }
  .va-step.on span { background: #ffc107; color: #1f2328; box-shadow: 0 0 0 4px rgba(255,193,7,0.2); }
  .va-step.done { color: #198754; }
  .va-step.done span { background: #198754; color: #fff; }
  .va-step-line { flex: 1; height: 2px; border-radius: 2px; background: #eef0f3; }
  .va-step-line.done { background: #198754; }
  .va-body { padding: 1.4rem 1.5rem !important; }
  .va-body .form-control:focus, .va-body .form-select:focus { border-color: #ffc107 !important; box-shadow: 0 0 0 3px rgba(255,193,7,0.18) !important; }
  .va-body .form-control:disabled, .va-body .form-select:disabled { background-color: #f8f9fa !important; }
  .va-alert { display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.75rem 0.9rem; border-radius: 10px; font-size: 0.85rem; line-height: 1.5; margin-bottom: 1rem; }
  .va-alert > i { margin-top: 3px; flex-shrink: 0; }
  .va-alert.danger { background: rgba(220,53,69,0.07); border: 1px solid rgba(220,53,69,0.25); color: #842029; }
  .va-alert.danger > i { color: #dc3545; }
  .va-alert.warn { background: rgba(255,193,7,0.1); border: 1px solid rgba(255,193,7,0.35); color: #6b5100; }
  .va-alert.warn > i { color: #e0a800; }
  .va-alert.info { background: rgba(13,110,253,0.06); border: 1px solid rgba(13,110,253,0.22); color: #0a58ca; align-items: center; }
  .va-alert.success { background: rgba(25,135,84,0.07); border: 1px solid rgba(25,135,84,0.25); color: #146c43; }
  .va-alert-sub { font-size: 0.76rem; opacity: 0.8; margin-top: 0.3rem; font-style: italic; }
  .va-tip { display: flex; gap: 0.75rem; padding: 0.85rem 1rem; border-radius: 12px; background: #f8f9ff; border: 1px solid rgba(67,97,238,0.18); margin-bottom: 1.25rem; }
  .va-tip-ic { width: 34px; height: 34px; border-radius: 10px; background: rgba(255,193,7,0.18); color: #b88a00; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .va-tip-title { font-weight: 700; color: #3a50c7; font-size: 0.86rem; margin-bottom: 0.15rem; }
  .va-tip p { margin: 0; font-size: 0.82rem; color: #4b5563; line-height: 1.55; }
  .va-readonly { display: flex; align-items: center; gap: 0.55rem; min-height: 44px; padding: 0.6rem 0.8rem; border-radius: 10px; border: 1.5px dashed #e5e7eb; background: #f8f9fa; font-size: 0.9rem; color: #9ca3af; }
  .va-readonly.ok { border-style: solid; border-color: rgba(25,135,84,0.35); background: #f6fbf8; color: #1f2328; font-weight: 600; }
  .va-readonly.ok i { color: #198754; }
  .va-hint { font-size: 0.78rem; margin-top: 0.35rem; display: flex; gap: 0.35rem; align-items: flex-start; }
  .va-hint.warn { color: #b26a00; }
  .va-drop { position: relative; min-height: 150px; border: 1.5px dashed #d1d5db; border-radius: 14px; background: #fafbfc; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.3rem; padding: 0.85rem; text-align: center; transition: border-color 0.15s ease, background 0.15s ease; overflow: hidden; }
  .va-drop:hover { border-color: #ffc107; background: #fffaeb; }
  .va-drop.has { border-style: solid; border-color: #ffc107; background: #fff; }
  .va-drop.disabled { opacity: 0.6; pointer-events: none; }
  .va-drop img { width: 100%; max-height: 120px; object-fit: contain; border-radius: 8px; }
  .va-drop-ic { width: 42px; height: 42px; border-radius: 12px; background: rgba(255,193,7,0.16); color: #b88a00; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; margin-bottom: 0.25rem; }
  .va-drop strong { font-size: 0.86rem; color: #1f2328; }
  .va-drop small { font-size: 0.76rem; color: #6b7280; }
  .va-drop-change { position: absolute; bottom: 8px; right: 8px; display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; font-weight: 700; color: #fff; background: rgba(17,24,39,0.7); padding: 0.2rem 0.55rem; border-radius: 999px; }
  .va-section-title { display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin: 0.75rem 0 0.75rem; padding-top: 1rem; border-top: 1px solid #eef0f3; }
  .va-section-title i { color: #e0a800; }
  .va-preview { display: flex; gap: 0.6rem; padding: 0.75rem 0.9rem; border-radius: 10px; background: #fffaeb; border: 1px solid rgba(255,193,7,0.35); font-size: 0.86rem; color: #1f2328; font-weight: 600; }
  .va-preview > i { color: #e0a800; margin-top: 3px; }
  .va-preview-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
  .va-foot { padding: 0.9rem 1.5rem !important; border-top: 1px solid #eef0f3 !important; display: flex; justify-content: flex-end; gap: 0.6rem; flex-wrap: nowrap !important; }
  .va-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 10px; border: 1px solid transparent; font-weight: 700; font-size: 0.9rem; padding: 0.65rem 1.2rem; white-space: nowrap; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; margin: 0; }
  .va-btn:disabled { opacity: 0.55; cursor: not-allowed; }
  .va-btn.primary { background: #ffc107; color: #1f2328; }
  .va-btn.primary:hover:not(:disabled) { background: #f0b400; box-shadow: 0 6px 16px rgba(255,193,7,0.35); transform: translateY(-1px); }
  .va-btn.ghost { background: #fff; color: #1f2328; border-color: #e5e7eb; font-weight: 600; }
  .va-btn.ghost:hover:not(:disabled) { background: #f6f7f9; }
  .va-btn.danger { background: #dc3545; color: #fff; }
  .va-btn.danger:hover:not(:disabled) { background: #bb2d3b; }
  @keyframes vaPop { 0% { transform: scale(0.7); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
  .va-small-body { padding: 1.9rem 1.6rem 1.4rem !important; text-align: center; }
  .va-small-icon { width: 60px; height: 60px; border-radius: 16px; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #e0a800; background: rgba(255,193,7,0.14); animation: vaPop 0.4s ease-out; }
  .va-small-icon.ok { color: #fff; background: #198754; }
  .va-small-icon.danger { color: #dc3545; background: rgba(220,53,69,0.12); }
  .va-small-title { font-weight: 700; color: #1f2328; margin-bottom: 0.35rem; font-size: 1.15rem; }
  .va-small-text { font-size: 0.88rem; color: #6b7280; line-height: 1.55; margin-bottom: 1.25rem; }
  .va-track { display: flex; align-items: flex-start; justify-content: center; }
  .va-track-step { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; width: 76px; }
  .va-track-step span { width: 30px; height: 30px; border-radius: 50%; background: #f3f4f6; color: #9ca3af; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; transition: all 0.4s ease; }
  .va-track-step small { font-size: 0.7rem; font-weight: 600; color: #9ca3af; }
  .va-track-step.on span { background: #ffc107; color: #1f2328; box-shadow: 0 0 0 4px rgba(255,193,7,0.22); }
  .va-track-step.on small { color: #b88a00; }
  .va-track-step.done span { background: #198754; color: #fff; }
  .va-track-step.done small { color: #198754; }
  .va-track-line { flex: 0 0 40px; height: 2px; margin-top: 14px; background: #eef0f3; transition: background 0.6s ease; }
  .va-track-line.done { background: #198754; }
  @media (max-width: 768px) {
    .va-zoom-modal { zoom: 1; }
    .va-zoom-modal.va-big .modal-dialog.va-modal { max-width: calc(100% - 1.5rem); height: calc(100% - 1.5rem); margin: 0.75rem auto; }
    .va-zoom-modal.va-big .va-head { padding: 1rem !important; }
    .va-zoom-modal.va-big .va-steps { padding: 0 1rem 0.85rem; }
    .va-zoom-modal.va-big .va-body { padding: 1rem !important; }
    .va-zoom-modal.va-big .va-foot { padding: 0.75rem 1rem !important; }
    .va-zoom-modal.va-big .va-drop { min-height: 150px; }
    .va-zoom-modal.va-big .va-drop img { max-height: 130px; }
    .va-zoom-modal .modal-dialog { margin: 0.75rem auto; max-width: calc(100% - 1.5rem); display: flex; align-items: center; min-height: calc(100% - 1.5rem); }
    .va-zoom-modal .modal-dialog-scrollable { height: calc(100% - 1.5rem); }
    .va-head { padding: 1rem !important; }
    .va-head-ic { width: 42px; height: 42px; }
    .va-title { font-size: 1.08rem; }
    .va-steps { padding: 0 1rem 0.85rem; }
    .va-body { padding: 1rem !important; }
    .va-drop { min-height: 128px; padding: 0.6rem; }
    .va-drop small { display: none; }
    .va-drop strong { font-size: 0.8rem; }
    .va-foot { padding: 0.75rem 1rem !important; }
    .va-foot .va-btn { flex: 1; padding: 0.65rem 0.6rem; font-size: 0.86rem; }
    .va-small-body { padding: 1.5rem 1.1rem 1.1rem !important; }
  }
  @media (prefers-reduced-motion: reduce) { .va-small-icon { animation: none; } }
`;

const VerifyAccountModal = ({ show, onHide, ownerProfile, profileForm: initialProfileForm, onVerified }) => {
  const [verifyStep, setVerifyStep]             = useState(1);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifyError, setVerifyError]           = useState('');
  const [verifySuccess, setVerifySuccess]       = useState('');
  const [profileForm, setProfileForm]           = useState({
    first_name: '', middle_name: '', last_name: '', birthdate: '', gender: '', phone: '',
  });
  const [idForm, setIdForm] = useState({
    valid_id_type: '', address: '', house_no: '', street: '', province: '', city: '', barangay: '',
  });
  const [provinces, setProvinces]       = useState([]);
  const [cities, setCities]             = useState([]);
  const [barangayList, setBarangayList] = useState([]);
  const [idFrontFile, setIdFrontFile]       = useState(null);
  const [idBackFile, setIdBackFile]         = useState(null);
  const [idFrontPreview, setIdFrontPreview] = useState('');
  const [idBackPreview, setIdBackPreview]   = useState('');
  const [profileFieldErrors, setProfileFieldErrors] = useState({});
  const [idOcrText, setIdOcrText]           = useState('');
  const [idBirthdate, setIdBirthdate]       = useState('');
  const [duplicateError, setDuplicateError] = useState('');
  const [ocrLoading, setOcrLoading]         = useState(false);
  const [ocrDone, setOcrDone]               = useState(false);
  const [nameMismatchWarning, setNameMismatchWarning] = useState('');
  const [idSideError, setIdSideError] = useState(null); // { title, message } for swapped/mismatched ID sides

  // Reviewing modal state
  const [showReviewingModal, setShowReviewingModal] = useState(false);
  const [reviewStep, setReviewStep]                 = useState(0);

  const registeredNameRef = React.useRef({ first: '', last: '' });
  const profileRestoredRef = useRef(false);     // a saved draft already filled profileForm
  const [draftReady, setDraftReady] = useState(false);

  // Exit confirmation state
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Load provinces on mount
  useEffect(() => {
    const ncr = getAllRegions().find(r => r.name.includes('National Capital'));
    const metroManila = ncr ? { name: 'Metro Manila', psgcCode: ncr.psgcCode, regionCode: ncr.psgcCode } : null;
    const sorted = [
      ...(metroManila ? [metroManila] : []),
      ...getAllProvinces().sort((a, b) => a.name.localeCompare(b.name)),
    ];
    setProvinces(sorted);
  }, []);

  // Sync profileForm from parent when modal opens
  useEffect(() => {
    if (show && initialProfileForm) {
      const digitsOnly = (initialProfileForm.phone || '').toString().replace(/\D/g, '');
      const localPhone = digitsOnly.startsWith('63') ? digitsOnly.slice(2)
        : digitsOnly.startsWith('0') ? digitsOnly.slice(1)
        : digitsOnly;
      if (!profileRestoredRef.current) setProfileForm({ ...initialProfileForm, phone: localPhone.slice(-10) });
      // Capture the name on file BEFORE any OCR auto-fill
      registeredNameRef.current = {
        first:  (initialProfileForm.first_name  || '').trim().toLowerCase(),
        middle: (initialProfileForm.middle_name || '').trim().toLowerCase(),
        last:   (initialProfileForm.last_name   || '').trim().toLowerCase(),
        birthdate: (initialProfileForm.birthdate || '').toString().slice(0, 10),
      };
    }
  }, [show, initialProfileForm]);

  // Reset all state when modal opens
  useEffect(() => {
    if (show) {
      setVerifyStep(1);
      setVerifyError('');
      setVerifySuccess('');
      setProfileFieldErrors({});
      setIdForm({ valid_id_type: '', address: '', house_no: '', street: '', province: '', city: '', barangay: '' });
      setCities([]);
      setBarangayList([]);
      setIdFrontFile(null); setIdBackFile(null);
      setIdFrontPreview(''); setIdBackPreview('');
      setOcrLoading(false); setOcrDone(false);
      setNameMismatchWarning('');
      setIdSideError(null);
      setIdOcrText('');
      setIdBirthdate('');
      setDuplicateError('');
      setShowExitConfirm(false);

      // Remember that the modal is open, then bring back any saved draft
      setPending(true);
      setDraftReady(false);
      profileRestoredRef.current = false;
      let cancelled = false;
      draftGet().then(d => {
        if (cancelled) return;
        if (d && Date.now() - (d.savedAt || 0) < DRAFT_TTL) {
          if (d.profileForm) { setProfileForm(d.profileForm); profileRestoredRef.current = true; }
          if (d.idForm) {
            setIdForm(d.idForm);
            if (d.idForm.province) setCities(getMunicipalitiesByProvince(d.idForm.province));
            if (d.idForm.city) setBarangayList(getBarangaysByMunicipality(d.idForm.city));
          }
          if (d.front) { setIdFrontFile(d.front); setIdFrontPreview(URL.createObjectURL(d.front)); }
          if (d.back)  { setIdBackFile(d.back);   setIdBackPreview(URL.createObjectURL(d.back)); }
          setIdOcrText(d.idOcrText || '');
          setIdBirthdate(d.idBirthdate || '');
          setDuplicateError(d.duplicateError || '');
          setNameMismatchWarning(d.nameMismatchWarning || '');
          setOcrDone(!!d.ocrDone);
          setVerifyStep(d.step === 2 && d.ocrDone && d.front && d.back ? 2 : 1);
          // Reloaded in the middle of a scan: scan the saved photos again
          if (d.front && d.back && !d.ocrDone) handleOCRScan(d.front, d.back);
        } else if (d) {
          draftDel();
        }
        setDraftReady(true);
      });
      return () => { cancelled = true; };
    }
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save the draft while the modal is open (photos included)
  useEffect(() => {
    if (!show || !draftReady || verifySubmitting) return;
    const t = setTimeout(() => {
      const hasProgress = idFrontFile || idBackFile || verifyStep === 2;
      if (!hasProgress) { draftDel(); return; }
      draftSet({
        savedAt: Date.now(),
        step: verifyStep,
        profileForm, idForm,
        front: idFrontFile, back: idBackFile,
        idOcrText, idBirthdate, ocrDone, duplicateError, nameMismatchWarning,
      });
    }, 400);
    return () => clearTimeout(t);
  }, [show, draftReady, verifySubmitting, verifyStep, profileForm, idForm, idFrontFile, idBackFile, idOcrText, idBirthdate, ocrDone, duplicateError, nameMismatchWarning]);

  // Closing on purpose (cancel / discard / submitted) forgets the draft
  const closeAndForget = () => {
    setPending(false);
    draftDel();
    onHide();
  };

    // ── Live name + city vs OCR check ────────────────────────────────────────
  useEffect(() => {
    if (verifyStep !== 2 || !idOcrText || idOcrText.length < 20) {
      setProfileFieldErrors(prev => ({ ...prev, first_name_ocr: '', last_name_ocr: '', city_ocr: '' }));
      return;
    }
    const ocrRaw = idOcrText.toLowerCase();
    const partialMatch = (name, raw) => {
      if (!name || name.length < 2) return true;
      const normalized = name.toLowerCase().trim();
      const wordBoundary = new RegExp(`\\b${normalized}\\b`, 'i');
      return wordBoundary.test(raw);
    };
    const firstVal  = profileForm.first_name.trim().toLowerCase();
    const middleVal = profileForm.middle_name.trim().toLowerCase();
    const lastVal   = profileForm.last_name.trim().toLowerCase();
    const regFirst  = registeredNameRef.current.first;
    const regMiddle = registeredNameRef.current.middle;
    const regLast   = registeredNameRef.current.last;

    // Not found on OCR text at all
    const firstNotOnId  = firstVal.length  >= 2 && !partialMatch(firstVal,  ocrRaw);
    const middleNotOnId = middleVal.length >= 2 && !partialMatch(middleVal, ocrRaw);
    const lastNotOnId   = lastVal.length   >= 2 && !partialMatch(lastVal,   ocrRaw);

    // Doesn't match the originally registered name
    const firstChangedFromReg  = regFirst.length  >= 2 && firstVal  !== regFirst  && !firstVal.includes(regFirst)   && !regFirst.includes(firstVal);
    const middleChangedFromReg = regMiddle.length >= 2 && middleVal !== regMiddle && !middleVal.includes(regMiddle) && !regMiddle.includes(middleVal);
    const lastChangedFromReg   = regLast.length   >= 2 && lastVal   !== regLast   && !lastVal.includes(regLast)     && !regLast.includes(lastVal);

    let firstError = '';
    if (firstNotOnId)             firstError = 'Name not found on your ID';
    else if (firstChangedFromReg) firstError = `Does not match registered name "${toTitleCase(regFirst)}"`;

    let middleError = '';
    if (middleVal.length >= 2) {
      if (middleNotOnId)             middleError = 'Name not found on your ID';
      else if (middleChangedFromReg) middleError = `Does not match registered name "${toTitleCase(regMiddle)}"`;
    }

    let lastError = '';
    if (lastNotOnId)             lastError = 'Name not found on your ID';
    else if (lastChangedFromReg) lastError = `Does not match registered name "${toTitleCase(regLast)}"`;

    const selectedCity = cities.find(c => c.psgcCode === idForm.city);
    const cityMismatch = !!selectedCity && !foundOnId(selectedCity.name, idOcrText);
    setProfileFieldErrors(prev => ({
      ...prev,
      first_name_ocr:  firstError,
      middle_name_ocr: middleError,
      last_name_ocr:   lastError,
      city_ocr:        cityMismatch ? 'This city was not found on your ID' : '',
    }));
  }, [profileForm.first_name, profileForm.middle_name, profileForm.last_name, idForm.city, idOcrText, verifyStep, cities]);

  // ── Live birthdate check: must match registered birthdate AND the ID ─────
  useEffect(() => {
    if (verifyStep !== 2) return;
    const regBirth = registeredNameRef.current.birthdate;
    const cur = profileForm.birthdate;
    let err = '';
    if (cur) {
      if (regBirth && cur !== regBirth)        err = 'Does not match your registered birthdate';
      else if (idBirthdate && cur !== idBirthdate) err = 'Birthdate does not match your ID';
    }
    setProfileFieldErrors(prev => prev.birthdate_ocr === err ? prev : { ...prev, birthdate_ocr: err });
  }, [profileForm.birthdate, idBirthdate, verifyStep]);

  // Try to match the OCR'd address text to a province/city/barangay in the PH address dataset
    // Match the ID's address to province / city / barangay in the PH address dataset
  const detectLocationFromAddress = (addressText, isMuntinlupaFlag, parts = {}) => {
    const text = norm(addressText);
    if (!text && !parts.city) return null;

    const metroManila      = provinces.find(p => p.name === 'Metro Manila');
    const cityHintAliases  = placeAliases(parts.city).filter(searchable);
    const provHint         = norm(parts.province);
    const hay              = `${text} ${provHint}`.trim();
    const ncrMentioned     = /\b(metro manila|ncr|national capital region)\b/.test(hay);

    const finish = (province, city, cities) => {
      const barangays = getBarangaysByMunicipality(city.psgcCode);
      return { province, city, cities, barangays, barangay: findBarangay(barangays, text, parts.barangay, city.name) };
    };

    const findCity = (cities, allowTextSearch) => {
      if (cityHintAliases.length) {
        const exact = cities.find(c => placeAliases(c.name).some(a => cityHintAliases.includes(a)));
        if (exact) return exact;
      }
      return allowTextSearch ? bestPlaceInText(cities, text) : null;
    };

    // 1) Fast path — OCR already flagged this as a Muntinlupa ID
    if (isMuntinlupaFlag && metroManila) {
      const ncrCities  = getMunicipalitiesByProvince(metroManila.psgcCode);
      const muntinlupa = ncrCities.find(c => norm(c.name).includes('muntinlupa'));
      if (muntinlupa) return finish(metroManila, muntinlupa, ncrCities);
    }

    // 2) Provinces the address actually names (e.g. LAGUNA), latest-mentioned first
    const mentioned = provinces
      .filter(p => p.name !== 'Metro Manila')
      .map(p => ({ p, pos: Math.max(-1, ...placeAliases(p.name).filter(searchable).map(a => lastIndexOfWord(hay, a))) }))
      .filter(x => x.pos >= 0)
      .sort((a, b) => b.pos - a.pos)
      .map(x => x.p);

    const attempts = [
      ...(ncrMentioned && metroManila ? [{ prov: metroManila, allowText: true }] : []),
      ...mentioned.map(prov => ({ prov, allowText: true })),
      ...(!ncrMentioned && metroManila ? [{ prov: metroManila, allowText: true }] : []),
      // Provinces NOT named in the address are only tried with the AI's exact city name —
      // never by free-text search (that's what turned "Rizal St." into Rizal, Cagayan).
      ...(cityHintAliases.length
        ? provinces.filter(p => p.name !== 'Metro Manila' && !mentioned.includes(p)).map(prov => ({ prov, allowText: false }))
        : []),
    ];

    for (const { prov, allowText } of attempts) {
      const cities = getMunicipalitiesByProvince(prov.psgcCode);
      const city   = findCity(cities, allowText);
      if (city) return finish(prov, city, cities);
    }
    return null;
  };

  // ── OCR helpers ──────────────────────────────────────────────────────────
  const runIdScan = async (frontFile, backFile) => {
    const formData = new FormData();
    formData.append('id_front', frontFile);
    if (backFile) formData.append('id_back', backFile);
    const res = await ownerAPI.scanId(formData);
    // Expected shape from backend:
    // {
    //   valid: boolean,
    //   reason: string | null,
    //   extracted: {
    //     first_name, middle_name, last_name, suffix,
    //     birthdate ("YYYY-MM-DD"), gender ("Male"|"Female"|"Other"),
    //     address, id_number, is_muntinlupa
    //   },
    //   raw_text: string
    // }
    return res.data;
  };

  const detectBlur = (file) => new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const grayscale = [];
      for (let i = 0; i < data.length; i += 4)
        grayscale.push(0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]);
      const w = canvas.width, h = canvas.height;
      let sum = 0, count = 0;
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          const lap = Math.abs(
            -grayscale[idx-w-1] - grayscale[idx-w] - grayscale[idx-w+1]
            -grayscale[idx-1]   + 8*grayscale[idx]  - grayscale[idx+1]
            -grayscale[idx+w-1] - grayscale[idx+w] - grayscale[idx+w+1]
          );
          sum += lap; count++;
        }
      }
      URL.revokeObjectURL(url);
      resolve((sum / count) < 2);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
    img.src = url;
  });

  

  const handleOCRScan = async (frontFile, backFile) => {
    if (!frontFile) return;
    setOcrLoading(true); setOcrDone(false); setVerifyError(''); setNameMismatchWarning(''); setIdSideError(null); setDuplicateError('');
    try {
      const isBlurry = await detectBlur(frontFile);
      if (isBlurry) {
        setVerifyError('Your ID image is too blurry to read. Please upload a clearer photo.');
        setOcrLoading(false); setIdFrontFile(null); setIdFrontPreview(''); return;
      }

      const result = await runIdScan(frontFile, backFile);

      if (!result?.valid) {
        const SIDE_ERROR_TITLES = {
          sides_swapped: 'Front & Back Are Swapped',
          front_is_back: 'Wrong Photo in "ID Front"',
          back_is_front: 'Wrong Photo in "ID Back"',
          id_mismatch:   "Front & Back Don't Match",
        };
        const title = SIDE_ERROR_TITLES[result?.error_type];
        if (title) {
          setIdSideError({ title, message: result.reason });
          setOcrLoading(false);
          setIdFrontFile(null); setIdFrontPreview('');
          setIdBackFile(null);  setIdBackPreview('');
          return;
        }
        setVerifyError(result?.reason || 'The uploaded image does not appear to be a valid ID. Please upload a clear photo of your government-issued ID.');
        setOcrLoading(false); setIdFrontFile(null); setIdFrontPreview(''); return;
      }

            const ex    = result.extracted || {};
      const parts = ex.address_parts || {};

      // The live name/city check reads this. Include the extracted address so the city is always
      // findable, and reflect the AI's own Muntinlupa flag.
      setIdOcrText([result.raw_text, ex.address, ex.is_muntinlupa ? 'muntinlupa city' : ''].filter(Boolean).join(' '));

      // Auto-fill profile fields from the scanned ID (source of truth for verification).
      const idPhone = normalizePhoneFromId(ex.phone);
      setProfileForm(prev => ({
        ...prev,
        first_name:  ex.first_name  || prev.first_name  || '',
        middle_name: ex.middle_name || prev.middle_name || '',
        last_name:   ex.last_name   || prev.last_name   || '',
        birthdate:   ex.birthdate   || prev.birthdate   || '',
        gender:      ex.gender      || prev.gender      || '',
        // Phone from ID if a valid PH mobile number was found, otherwise keep the registered one
        phone:       idPhone        || prev.phone       || '',
      }));
      if (idPhone) setProfileFieldErrors(prev => ({ ...prev, phone: '' }));
      setIdBirthdate(ex.birthdate || '');

      // Auto-select province / city / barangay, and pre-fill house no. + street (still editable)
      const detectedLocation = detectLocationFromAddress(ex.address, ex.is_muntinlupa, parts);
      if (detectedLocation) {
        setCities(detectedLocation.cities);
        setBarangayList(detectedLocation.barangays);
      }
      const { house_no, street } = extractHouseAndStreet(ex.address, parts, detectedLocation);

      setIdForm(prev => ({
        ...prev,
        valid_id_type: VALID_ID_TYPES.includes(ex.id_type) ? ex.id_type : (prev.valid_id_type || 'Other'),
        isMuntinlupa: !!ex.is_muntinlupa,
        address:  ex.address || prev.address,
        house_no: house_no || prev.house_no || '',
        street:   street   || prev.street   || '',
        ...(detectedLocation && {
          province:     detectedLocation.province.psgcCode,
          provinceName: detectedLocation.province.name,
          city:         detectedLocation.city.psgcCode,
          cityName:     detectedLocation.city.name,
          barangay:     detectedLocation.barangay ? detectedLocation.barangay.psgcCode : '',
        }),
      }));

      setOcrDone(true);
      if (result.duplicate?.found) setDuplicateError(result.duplicate.message);

      if (!ex.is_muntinlupa) {
        setNameMismatchWarning('Your ID address does not appear to be from Muntinlupa City. You will be marked as Semi Verified instead of Fully Verified.');
      }
    } catch (err) {
      console.error('scanId error:', err.response?.status, err.response?.data);
      setVerifyError(
        err.response?.data?.error ||
        err.response?.data?.reason ||
        (typeof err.response?.data === 'string' ? err.response.data.slice(0, 300) : null) ||
        'ID scan failed. Please check your connection and try again.'
      );
    } finally {
      setOcrLoading(false);
    }
  };

  // ── Form handlers ────────────────────────────────────────────────────────
  const handleProfileFormChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
    if (verifyError) setVerifyError('');
    if (['first_name', 'middle_name', 'last_name'].includes(name)) {
      if (value && !/^[a-zA-Z.\s-]*$/.test(value))        setProfileFieldErrors(prev => ({ ...prev, [name]: 'Only letters, dots, spaces, and hyphens allowed' }));
      else if (value && value.startsWith(' '))             setProfileFieldErrors(prev => ({ ...prev, [name]: 'Cannot start with a space' }));
      else if (value && value.startsWith('-'))             setProfileFieldErrors(prev => ({ ...prev, [name]: 'Cannot start with a hyphen' }));
      else if (value && /\s{2,}/.test(value))             setProfileFieldErrors(prev => ({ ...prev, [name]: 'Cannot contain multiple consecutive spaces' }));
      else if (value && /--/.test(value))                  setProfileFieldErrors(prev => ({ ...prev, [name]: 'Cannot contain consecutive hyphens' }));
      else                                                  setProfileFieldErrors(prev => ({ ...prev, [name]: '' }));
    }
    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setProfileForm(prev => ({ ...prev, phone: digitsOnly }));
      setProfileFieldErrors(prev => ({ ...prev, phone: digitsOnly && !/^9\d{9}$/.test(digitsOnly) ? 'Invalid input' : '' }));
    }
  };

  const handleIdFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'province') {
      setCities(getMunicipalitiesByProvince(value));
      setBarangayList([]);
      setIdForm(prev => ({ ...prev, province: value, provinceName: provinces.find(p => p.psgcCode === value)?.name || '', city: '', cityName: '', barangay: '', address: '' }));
    } else if (name === 'city') {
      setBarangayList(getBarangaysByMunicipality(value));
      setIdForm(prev => ({ ...prev, city: value, cityName: cities.find(c => c.psgcCode === value)?.name || '', barangay: '', address: '' }));
    } else {
      setIdForm(prev => {
        const updated = { ...prev, [name]: value };
        const parts = [updated.house_no, updated.street, updated.barangay, updated.cityName || updated.city, updated.provinceName || updated.province].filter(Boolean);
        updated.address = parts.join(', ');
        return updated;
      });
    }
    if (verifyError) setVerifyError('');
  };

  const handleVerifyStep1Next = () => {
    if (!idFrontFile)          { setVerifyError('Please upload the front of your ID.'); return; }
    if (!idBackFile)           { setVerifyError('Please upload the back of your ID.'); return; }
    if (!ocrDone)              { setVerifyError('Please wait for the ID scan to complete.'); return; }
    if (duplicateError)        { setVerifyError(duplicateError); return; }
    if (!idForm.valid_id_type) { setVerifyError('Please select a valid ID type.'); return; }
    setVerifyError('');
    setVerifyStep(2);
  };

    // ── Exit confirmation ────────────────────────────────────────────────────
  const requestClose = () => {
    if (verifySubmitting) return;
    if (verifyStep === 2) {
      // Step 2 always confirms before closing
      setShowExitConfirm(true);
      return;
    }
    // Step 1: only confirm if the user has started filling something in
    const hasProgress = !!(idFrontFile || idBackFile || idForm.valid_id_type);
    if (hasProgress) {
      setShowExitConfirm(true);
    } else {
      closeAndForget();
    }
  };

  const confirmClose = () => {
    setShowExitConfirm(false);
    closeAndForget();
  };

  const handleVerifySubmit = async () => {
    if (!profileForm.first_name.trim() || !profileForm.last_name.trim()) { setVerifyError('First name and last name are required.'); return; }
if (!profileForm.birthdate) { setVerifyError('Birthdate is required.'); return; }
if (!profileForm.gender) { setVerifyError('Gender is required.'); return; }
const birthCheck = new Date(profileForm.birthdate);
const minAgeCheck = new Date(); minAgeCheck.setFullYear(minAgeCheck.getFullYear() - 18);
if (birthCheck > minAgeCheck) { setVerifyError('You must be at least 18 years old.'); return; }
    if (!profileForm.phone.trim() || !/^9\d{9}$/.test(profileForm.phone)) { setVerifyError('Enter a valid 10-digit phone number starting with 9.'); return; }
    if (!idForm.province || !idForm.city) { setVerifyError('Please select your province and city/municipality.'); return; }
    const hasNameErrors = profileFieldErrors.first_name || profileFieldErrors.middle_name || profileFieldErrors.last_name || profileFieldErrors.phone || profileFieldErrors.first_name_ocr || profileFieldErrors.middle_name_ocr || profileFieldErrors.last_name_ocr || profileFieldErrors.city_ocr || profileFieldErrors.birthdate_ocr;
    if (hasNameErrors) { setVerifyError('Please fix the errors in the form before continuing.'); return; }

    const ocrRaw = idOcrText.toLowerCase();
    const mismatch = [];
    const partialMatch = (name, raw) => {
      if (!name || name.length < 2) return true;
      const normalized = name.toLowerCase().trim();
      const wordBoundary = new RegExp(`\\b${normalized}\\b`, 'i');
      return wordBoundary.test(raw);
    };
    if (ocrRaw.length > 20) {
      if (!partialMatch(profileForm.first_name.trim().toLowerCase(), ocrRaw)) mismatch.push(`First name "${profileForm.first_name}" was not found on your ID`);
      if (!partialMatch(profileForm.last_name.trim().toLowerCase(),  ocrRaw)) mismatch.push(`Last name "${profileForm.last_name}" was not found on your ID`);
    }
    if (mismatch.length) { setVerifyError('Name mismatch with your ID — ' + mismatch.join('; ') + '. Please correct your name or re-upload an ID that matches.'); return; }

    try {
      setVerifySubmitting(true); setVerifyError('');
      const u = getUser();
      // Name and gender are intentionally NOT updated — only birthdate and phone
      await ownerAPI.update(u?.id || u?.user_id, { birthdate: profileForm.birthdate, phone: `+63${profileForm.phone}` });
      const toBase64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
      const frontB64 = await toBase64(idFrontFile);
      const backB64  = await toBase64(idBackFile);
      const fullAddress = [idForm.house_no, idForm.street, barangayList.find(b => b.psgcCode === idForm.barangay)?.name || idForm.barangay, cities.find(c => c.psgcCode === idForm.city)?.name || idForm.city, provinces.find(p => p.psgcCode === idForm.province)?.name || idForm.province].filter(Boolean).join(', ');
      await ownerAPI.submitId(u.id, { valid_id_type: idForm.valid_id_type, valid_id_front: frontB64, valid_id_back: backB64, selfie_with_id: null, address: fullAddress, is_muntinlupa: idForm.isMuntinlupa === true });
      const res = await ownerAPI.getByUserId(u.id);
      closeAndForget();
      if (onVerified) onVerified(res.data.owner);
      setReviewStep(0);
      setShowReviewingModal(true);
      setTimeout(() => setReviewStep(1), 1200);
      setTimeout(() => setReviewStep(2), 2800);
    } catch (err) {
      setVerifyError(err.response?.data?.error || 'Failed to submit. Please try again.');
    } finally {
      setVerifySubmitting(false);
    }
  };

  const ls = { fontWeight:'600', color:'#374151', fontSize:'0.84rem', marginBottom:'0.35rem', display:'flex', alignItems:'center' };
  const es = { borderRadius:'10px', padding:'0.62rem 0.8rem', border:'1.5px solid #e5e7eb', background:'#fff', color:'#1f2328', fontWeight:'500', fontSize:'0.92rem', transition:'border-color 0.15s ease, box-shadow 0.15s ease' };
  const Req = () => <span style={{ color:'#ef4444', marginLeft:'2px' }}>*</span>;

  const selectedCity  = cities.find(c => c.psgcCode === idForm.city);
  const cityMatchesId = idOcrText && selectedCity ? foundOnId(selectedCity.name, idOcrText) : null;
  const regMiddle     = registeredNameRef.current.middle || '';

  return (
    <>
      {/* ── Verification Modal ── */}
      <style>{VA_STYLES}</style>
      <Modal show={show} onHide={requestClose} backdrop="static" dialogClassName="va-modal" className="va-zoom-modal va-big" style={{ zIndex: 99999 }} scrollable>
        <Modal.Header closeButton={!verifySubmitting} className="va-head">
          <div className="va-head-main">
            <div className="va-head-ic"><i className="fas fa-id-card" /></div>
            <div style={{ minWidth: 0 }}>
              <div className="va-kicker">Account verification · Step {verifyStep} of 2</div>
              <Modal.Title as="h5" className="va-title">{verifyStep === 1 ? 'Upload a valid ID' : 'Confirm your details'}</Modal.Title>
            </div>
          </div>
        </Modal.Header>
        <div className="va-steps">
          {[{ n: 1, label: 'Upload ID' }, { n: 2, label: 'Confirm details' }].map((s, i) => (
            <React.Fragment key={s.n}>
              {i > 0 && <div className={`va-step-line${verifyStep > 1 ? ' done' : ''}`} />}
              <div className={`va-step${verifyStep === s.n ? ' on' : verifyStep > s.n ? ' done' : ''}`}>
                <span>{verifyStep > s.n ? <i className="fas fa-check" /> : s.n}</span>{s.label}
              </div>
            </React.Fragment>
          ))}
        </div>
        <Modal.Body className="va-body">

          {verifyError && (
            <div className="va-alert danger"><i className="fas fa-exclamation-circle" /><span>{verifyError}</span></div>
          )}

          {/* ── Step 1 ── */}
          {verifyStep === 1 && (
            <>
              {nameMismatchWarning && (
                <div className="va-alert warn"><i className="fas fa-exclamation-triangle" /><span>{nameMismatchWarning}</span></div>
              )}

              {idSideError && (
                <div className="va-alert danger">
                  <i className="fas fa-arrows-rotate" />
                  <div>
                    <strong className="d-block">{idSideError.title}</strong>
                    <span>{idSideError.message}</span>
                    <div className="va-alert-sub">Both photos were cleared — please re-upload the correct front and back.</div>
                  </div>
                </div>
              )}
              {ocrLoading && (
                <div className="va-alert info">
                  <Spinner animation="border" style={{ color:'#0d6efd', width:'1rem', height:'1rem', borderWidth:'0.15em', flexShrink:0 }} />
                  <span><strong>Scanning your ID…</strong> Please wait while we read your information.</span>
                </div>
              )}
              {duplicateError && !ocrLoading && (
                <div className="va-alert danger">
                  <i className="fas fa-user-lock" />
                  <span><strong>Account already verified.</strong> {duplicateError}</span>
                </div>
              )}
              {ocrDone && !ocrLoading && !duplicateError && (
                <div className="va-alert success">
                  <i className="fas fa-check-circle" />
                  <span><strong>ID scanned successfully.</strong> Your details were filled in automatically. Please review them on the next step.</span>
                </div>
              )}

              <div className="va-tip">
                <div className="va-tip-ic"><i className="fas fa-lightbulb" /></div>
                <div>
                  <div className="va-tip-title">Tip for Muntinlupa residents</div>
                  <p>If your current ID doesn't show a Muntinlupa address, get a free <strong>Barangay ID</strong> from your barangay hall. A Barangay ID with your Muntinlupa address qualifies you for <strong className="text-success">Full Verification</strong>.</p>
                </div>
              </div>

              <Form.Group className="mb-3">
                <Form.Label style={ls}>ID type</Form.Label>
                <div className={`va-readonly${idForm.valid_id_type ? ' ok' : ''}`}>
                  {idForm.valid_id_type
                    ? <><i className="fas fa-check-circle" />{idForm.valid_id_type}</>
                    : <><i className="fas fa-magic" />Detected automatically after you upload both sides</>}
                </div>
                {idForm.valid_id_type === 'Other' && (
                  <div className="va-hint warn"><i className="fas fa-exclamation-triangle" />We couldn't confidently match a known ID type, so it will be checked manually.</div>
                )}
              </Form.Group>

              <Row className="mb-3">
                {[
                  { label: 'ID Front', file: idFrontFile, preview: idFrontPreview, setter: setIdFrontFile, previewSetter: setIdFrontPreview },
                  { label: 'ID Back',  file: idBackFile,  preview: idBackPreview,  setter: setIdBackFile,  previewSetter: setIdBackPreview },
                ].map(({ label, preview, setter, previewSetter }) => (
                  <Col xs={6} key={label}>
                    <Form.Group className="mb-3">
                      <Form.Label style={ls}>
                        <i className="fas fa-camera me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />
                        {label} <Req />
                      </Form.Label>
                      <label style={{ display:'block', cursor: verifySubmitting ? 'not-allowed' : 'pointer' }}>
                        <div className={`va-drop${preview ? ' has' : ''}${verifySubmitting ? ' disabled' : ''}`}>
                          {preview
                            ? <><img src={preview} alt={label} /><span className="va-drop-change"><i className="fas fa-sync-alt" />Change</span></>
                            : <><span className="va-drop-ic"><i className="fas fa-camera" /></span><strong>{label === 'ID Front' ? 'Front of your ID' : 'Back of your ID'}</strong><small>Tap to upload a clear photo</small></>
                          }
                        </div>
                        <input
                          type="file" accept="image/*" style={{ display:'none' }}
                          disabled={verifySubmitting || ocrLoading}
                          onChange={async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            setter(file);
                            previewSetter(URL.createObjectURL(file));

                            let newFront = label === 'ID Front' ? file : idFrontFile;
                            let newBack  = label === 'ID Back'  ? file : idBackFile;

                            // Uploading a new front ID invalidates whatever back ID was there before
                            if (label === 'ID Front' && idBackFile) {
                              setIdBackFile(null);
                              setIdBackPreview('');
                              newBack = null;
                            }

                            setOcrDone(false); setNameMismatchWarning(''); setVerifyError(''); setIdSideError(null); setDuplicateError('');
                            // Only scan once BOTH front and back are uploaded
                            if (newFront && newBack) {
                              await handleOCRScan(newFront, newBack);
                            }
                          }}
                        />
                      </label>
                    </Form.Group>
                  </Col>
                ))}
              </Row>

              </>
          )}

          {/* ── Step 2 ── */}
          {verifyStep === 2 && (
            <>
              <div className="va-alert warn">
                <i className="fas fa-info-circle" />
                <span>Check that your details are correct. Your <strong>name must match your uploaded ID</strong>.</span>
              </div>

              <Form.Group className="mb-3">
                <Form.Label style={ls}><i className="fas fa-envelope me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Email Address</Form.Label>
                <Form.Control type="email" value={ownerProfile?.email || ''} readOnly style={{ ...es, background:'#e9ecef', color:'#6c757d', cursor:'not-allowed' }} />
                <small style={{ color:'#9ca3af', fontSize:'0.8rem' }}><i className="fas fa-lock me-1" />Email cannot be changed</small>
              </Form.Group>

              <Row>
                {[
                  { name:'first_name', label:'First Name', req:true },
                  { name:'middle_name', label:'Middle Name', req:false },
                  { name:'last_name', label:'Last Name', req:true },
                ].map(({ name, label, req }) => (
                  <Col md={4} key={name}>
                    <Form.Group className="mb-3">
                      <Form.Label style={ls}><i className="fas fa-user me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />{label} {req && <Req />}</Form.Label>
                      <Form.Control type="text" name={name} value={profileForm[name]} onChange={handleProfileFormChange}
  onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }}
  onBlur={(e) => {
    const v = e.target.value;
    if (v.endsWith('-')) setProfileFieldErrors(prev => ({ ...prev, [name]: 'Cannot end with a hyphen' }));
    else if (v.endsWith(' ')) setProfileFieldErrors(prev => ({ ...prev, [name]: 'Cannot end with a space' }));
  }}
  placeholder={req ? label : 'Optional'} disabled={verifySubmitting} maxLength={30}
  style={{ ...es, border: (profileFieldErrors[name] || profileFieldErrors[`${name}_ocr`]) ? '2px solid #ef4444' : profileForm[name] && !profileFieldErrors[name] && !profileFieldErrors[`${name}_ocr`] && (name !== 'middle_name' || regMiddle.length >= 2) ? '2px solid #10b981' : es.border }} />
                      {profileFieldErrors[name] && <small style={{ color:'#ef4444', display:'block', marginTop:'0.3rem', fontSize:'0.78rem' }}><i className="fas fa-times-circle me-1" />{profileFieldErrors[name]}</small>}
                      {!profileFieldErrors[name] && profileFieldErrors[`${name}_ocr`] && <small style={{ color:'#ef4444', display:'block', marginTop:'0.3rem', fontSize:'0.78rem' }}><i className="fas fa-id-card me-1" />{profileFieldErrors[`${name}_ocr`]}</small>}
                    </Form.Group>
                  </Col>
                ))}
              </Row>

              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label style={ls}><i className="fas fa-calendar me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Birthdate <Req /></Form.Label>
                    <Form.Control type="date" name="birthdate" value={profileForm.birthdate} onChange={(e) => {
  handleProfileFormChange(e);
  if (e.target.value) {
    const birth = new Date(e.target.value);
    const minAge = new Date();
    minAge.setFullYear(minAge.getFullYear() - 18);
    setProfileFieldErrors(prev => ({ ...prev, birthdate: birth > minAge ? 'You must be at least 18 years old' : '' }));
  } else {
    setProfileFieldErrors(prev => ({ ...prev, birthdate: '' }));
  }
}} max={(() => { const d = new Date(); d.setFullYear(d.getFullYear() - 18); return d.toISOString().split('T')[0]; })()} disabled={verifySubmitting}
style={{ ...es, colorScheme:'light', border: (profileFieldErrors.birthdate || profileFieldErrors.birthdate_ocr) ? '2px solid #ef4444' : profileForm.birthdate && !profileFieldErrors.birthdate ? '2px solid #10b981' : es.border }} />
{profileFieldErrors.birthdate && <small style={{ color:'#ef4444', display:'block', marginTop:'0.3rem', fontSize:'0.78rem' }}><i className="fas fa-times-circle me-1" />{profileFieldErrors.birthdate}</small>}
{!profileFieldErrors.birthdate && profileFieldErrors.birthdate_ocr && <small style={{ color:'#ef4444', display:'block', marginTop:'0.3rem', fontSize:'0.78rem' }}><i className="fas fa-id-card me-1" />{profileFieldErrors.birthdate_ocr}</small>}
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label style={ls}><i className="fas fa-venus-mars me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Gender <Req /></Form.Label>
                    <Form.Select name="gender" value={profileForm.gender} onChange={handleProfileFormChange} disabled={verifySubmitting} style={es}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label style={ls}><i className="fas fa-phone me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Phone Number <Req /></Form.Label>
                    <div style={{ display:'flex' }}>
                      <span style={{
                        display:'flex', alignItems:'center', justifyContent:'center',
                        padding:'0 0.85rem',
                        borderRadius:'10px 0 0 10px',
                        border: profileFieldErrors.phone ? '2px solid #ef4444' : (profileForm.phone && /^9\d{9}$/.test(profileForm.phone)) ? '2px solid #10b981' : es.border,
                        borderRight:'none',
                        background:'#e9ecef', color:'#1a1a1a', fontWeight:'700', fontSize:'0.9rem',
                      }}>
                        +63
                      </span>
                      <Form.Control type="tel" name="phone" value={profileForm.phone} onChange={handleProfileFormChange}
  onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) e.preventDefault(); }}
  placeholder="9123456789" disabled={verifySubmitting} maxLength={10}
  style={{ ...es, border: profileFieldErrors.phone ? '2px solid #ef4444' : (profileForm.phone && /^9\d{9}$/.test(profileForm.phone)) ? '2px solid #10b981' : es.border, borderRadius:'0 10px 10px 0', borderLeftWidth:0 }} />
                    </div>
{profileFieldErrors.phone && <small style={{ color:'#ef4444', display:'block', marginTop:'0.3rem', fontSize:'0.78rem' }}><i className="fas fa-times-circle me-1" />{profileFieldErrors.phone}</small>}
{!profileFieldErrors.phone && profileForm.phone && /^9\d{9}$/.test(profileForm.phone) && <small style={{ color:'#10b981', display:'block', marginTop:'0.3rem', fontSize:'0.78rem' }}><i className="fas fa-check-circle me-1" />Valid phone number</small>}
                  </Form.Group>
                </Col>
              </Row>

              <div className="va-section-title"><i className="fas fa-map-marker-alt" />Address</div>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={ls}><i className="fas fa-map me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Province / Region <Req /></Form.Label>
                    <Form.Select name="province" value={idForm.province} onChange={handleIdFormChange} disabled={verifySubmitting} style={es}>
                      <option value="">Select Province</option>
                      {provinces.map(p => <option key={p.psgcCode} value={p.psgcCode}>{p.name}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={ls}>
                      <i className="fas fa-city me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />City / Municipality <Req />
                      {idForm.city && cityMatchesId === true  && <span style={{ marginLeft:'0.5rem', fontSize:'0.72rem', color:'#198754', fontWeight:'600' }}><i className="fas fa-check-circle me-1" />Matches ID</span>}
                      {idForm.city && cityMatchesId === false && <span style={{ marginLeft:'0.5rem', fontSize:'0.72rem', color:'#f59e0b', fontWeight:'600' }}><i className="fas fa-exclamation-triangle me-1" />Not found on ID</span>}
                    </Form.Label>
                    <Form.Select name="city" value={idForm.city} onChange={handleIdFormChange} disabled={verifySubmitting || !idForm.province} style={{ ...es, border: profileFieldErrors.city_ocr ? '2px solid #ef4444' : idForm.city && cityMatchesId === true ? '2px solid #10b981' : es.border }}>
                      <option value="">Select City / Municipality</option>
                      {cities.map(c => <option key={c.psgcCode} value={c.psgcCode}>{c.name}</option>)}
                    </Form.Select>
                    {profileFieldErrors.city_ocr && <small style={{ color:'#ef4444', display:'block', marginTop:'0.3rem', fontSize:'0.78rem' }}><i className="fas fa-times-circle me-1" />{profileFieldErrors.city_ocr}</small>}
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label style={ls}><i className="fas fa-map-pin me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Barangay</Form.Label>
                    <Form.Select name="barangay" value={idForm.barangay} onChange={handleIdFormChange} disabled={verifySubmitting || !idForm.city} style={es}>
                      <option value="">Select Barangay</option>
                      {barangayList.map(b => <option key={b.psgcCode} value={b.psgcCode}>{b.name}</option>)}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={ls}><i className="fas fa-home me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />House No.</Form.Label>
                    <Form.Control type="text" name="house_no" value={idForm.house_no || ''} onChange={handleIdFormChange} placeholder="e.g. 123" disabled={verifySubmitting} style={es} />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label style={ls}><i className="fas fa-road me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Street</Form.Label>
                    <Form.Control type="text" name="street" value={idForm.street || ''} onChange={handleIdFormChange} placeholder="Street name" disabled={verifySubmitting} style={es} />
                  </Form.Group>
                </Col>
              </Row>

              {(idForm.province || idForm.city || idForm.barangay) && (
                <div className="va-preview">
                  <i className="fas fa-map-marker-alt" />
                  <div>
                    <div className="va-preview-label">Address preview</div>
                    {[idForm.house_no, idForm.street, barangayList.find(b => b.psgcCode === idForm.barangay)?.name, cities.find(c => c.psgcCode === idForm.city)?.name, provinces.find(p => p.psgcCode === idForm.province)?.name].filter(Boolean).join(', ')}
                  </div>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer className="va-foot">
          {verifyStep === 1 ? (
            <>
              <button type="button" className="va-btn ghost" onClick={requestClose} disabled={verifySubmitting}>Cancel</button>
              <button type="button" className="va-btn primary" onClick={handleVerifyStep1Next}
                disabled={verifySubmitting || ocrLoading || !ocrDone || !idFrontFile || !idBackFile || !!duplicateError}>
                {ocrLoading ? <WaveDots /> : <>Next: confirm details<i className="fas fa-arrow-right" /></>}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="va-btn ghost" onClick={() => setVerifyStep(1)} disabled={verifySubmitting}><i className="fas fa-arrow-left" />Back</button>
              <button type="button" className="va-btn primary" onClick={handleVerifySubmit}
                disabled={verifySubmitting || !idForm.barangay || !idForm.street || !idForm.house_no}>
                {verifySubmitting ? <WaveDots /> : <><i className="fas fa-paper-plane" />Submit for verification</>}
              </button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* ── Post-submission Reviewing Modal ── */}
      <Modal show={showReviewingModal} onHide={() => {}} backdrop="static" keyboard={false} centered dialogClassName="va-small" className="va-zoom-modal" style={{ zIndex: 99999 }}>
        <Modal.Body className="va-small-body">
          <div className={`va-small-icon${reviewStep === 2 ? ' ok' : ''}`}>
            {reviewStep < 2
              ? <Spinner animation="border" style={{ color:'#e0a800', width:'1.6rem', height:'1.6rem', borderWidth:'3px' }} />
              : <i className="fas fa-check" />}
          </div>
          <h5 className="va-small-title">
            {reviewStep === 0 && 'Submitting your ID…'}
            {reviewStep === 1 && 'Checking your ID'}
            {reviewStep === 2 && 'Submission complete!'}
          </h5>
          <p className="va-small-text">
            {reviewStep === 0 && 'Uploading your documents, please wait.'}
            {reviewStep === 1 && 'We are checking the details on your ID.'}
            {reviewStep === 2 && 'Your ID has been submitted and your verification status has been updated.'}
          </p>
          <div className="va-track">
            {[{ label:'Submitted', icon:'fa-paper-plane' }, { label:'Checking', icon:'fa-search' }, { label:'Done', icon:'fa-check' }].map((s, i) => {
              const done = reviewStep > i || reviewStep === 2, active = reviewStep === i && reviewStep < 2;
              return (
                <React.Fragment key={s.label}>
                  {i > 0 && <div className={`va-track-line${reviewStep >= i ? ' done' : ''}`} />}
                  <div className={`va-track-step${done ? ' done' : active ? ' on' : ''}`}>
                    <span><i className={`fas ${done ? 'fa-check' : s.icon}`} /></span>
                    <small>{s.label}</small>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </Modal.Body>
        {reviewStep === 2 && (
          <Modal.Footer className="va-foot">
            <button type="button" className="va-btn primary w-100" onClick={() => { setShowReviewingModal(false); window.location.reload(); }}>
              <i className="fas fa-check" />Done
            </button>
          </Modal.Footer>
        )}
      </Modal>

      {/* ── Exit Confirmation Modal ── */}
      <Modal show={showExitConfirm} onHide={() => setShowExitConfirm(false)} centered dialogClassName="va-small" className="va-zoom-modal" style={{ zIndex: 100000 }}>
        <Modal.Body className="va-small-body">
          <div className="va-small-icon danger"><i className="fas fa-exclamation-triangle" /></div>
          <h5 className="va-small-title">Discard your progress?</h5>
          <p className="va-small-text mb-0">Your uploaded ID and the details you entered will be lost if you leave now.</p>
        </Modal.Body>
        <Modal.Footer className="va-foot">
          <button type="button" className="va-btn ghost" onClick={() => setShowExitConfirm(false)}>Keep editing</button>
          <button type="button" className="va-btn danger" onClick={confirmClose}>Discard &amp; exit</button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default VerifyAccountModal;