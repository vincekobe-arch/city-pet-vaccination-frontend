import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
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
      setProfileForm({ ...initialProfileForm, phone: localPhone.slice(-10) });
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
    }
  }, [show]);

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
      onHide();
    }
  };

  const confirmClose = () => {
    setShowExitConfirm(false);
    onHide();
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
      onHide();
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

  const ls = { fontWeight:'600', color:'#1a1a1a', fontSize:'0.875rem', marginBottom:'0.4rem', display:'flex', alignItems:'center' };
  const es = { borderRadius:'10px', padding:'0.65rem 0.9rem', border:'2px solid #dee2e6', background:'#f8f9fa', color:'#1a1a1a', fontWeight:'500', fontSize:'0.9rem', transition:'all 0.2s' };
  const Req = () => <span style={{ color:'#ef4444', marginLeft:'2px' }}>*</span>;

  const selectedCity  = cities.find(c => c.psgcCode === idForm.city);
  const cityMatchesId = idOcrText && selectedCity ? foundOnId(selectedCity.name, idOcrText) : null;
  const regMiddle     = registeredNameRef.current.middle || '';

  return (
    <>
      {/* ── Verification Modal ── */}
      <Modal show={show} onHide={requestClose} size="lg" backdrop="static" style={{ zoom: window.innerWidth >= 1920 ? 1 : window.innerWidth >= 1600 ? 0.9 : 0.75, zIndex: 99999 }}>        <Modal.Header closeButton={!verifySubmitting} style={{ background:'linear-gradient(135deg,#f8f9fa,#e9ecef)', borderBottom:'2px solid #ffc107', borderRadius:'20px 20px 0 0' }}>
          <Modal.Title style={{ fontWeight:'800', color:'#333' }}>
            <i className="fas fa-id-card me-2" style={{ color:'#ffc107' }} />
            {verifyStep === 1 ? 'Step 1 of 2 — Upload Valid ID' : 'Step 2 of 2 — Confirm Your Profile'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding:'2rem', maxHeight:'72vh', overflowY:'auto' }}>
          <div style={{ display:'flex', gap:'0.5rem', marginBottom:'1.75rem' }}>
            {[1,2].map(s => (
              <div key={s} style={{ flex:1, height:'6px', borderRadius:'999px', background: verifyStep >= s ? '#ffc107' : '#e9ecef', transition:'background 0.4s' }} />
            ))}
          </div>

          {verifyError && (
            <Alert variant="danger" className="mb-3" style={{ borderRadius:'12px', border:'2px solid rgba(220,53,69,0.25)', background:'rgba(220,53,69,0.07)', color:'#1a1a1a', fontSize:'0.875rem' }}>
              <i className="fas fa-exclamation-circle me-2" style={{ color:'#dc3545' }} />{verifyError}
            </Alert>
          )}

          {/* ── Step 1 ── */}
          {verifyStep === 1 && (
            <>
              {nameMismatchWarning && (
                <div style={{ background:'rgba(255,193,7,0.08)', border:'1.5px solid #ffc107', borderRadius:'10px', padding:'0.75rem 1rem', marginBottom:'1rem', fontSize:'0.82rem', color:'#7a5800', display:'flex', alignItems:'flex-start', gap:'0.5rem' }}>
                  <i className="fas fa-exclamation-triangle" style={{ color:'#ffc107', marginTop:'0.1rem', flexShrink:0 }} />
                  <span>{nameMismatchWarning}</span>
                </div>
              )}

              {idSideError && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(220,53,69,0.07), rgba(255,193,7,0.09))',
                  border: '1.5px solid rgba(220,53,69,0.3)',
                  borderRadius: '14px',
                  padding: '1rem 1.1rem',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.85rem',
                  boxShadow: '0 6px 18px rgba(220,53,69,0.12)',
                }}>
                  <div style={{
                    width: '38px', height: '38px', borderRadius: '50%',
                    background: 'rgba(220,53,69,0.12)', border: '2px solid rgba(220,53,69,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <i className="fas fa-arrows-rotate" style={{ color: '#dc3545', fontSize: '0.95rem' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '800', color: '#b02a37', fontSize: '0.92rem', marginBottom: '0.25rem' }}>
                      {idSideError.title}
                    </div>
                    <div style={{ fontSize: '0.83rem', color: '#6b2530', lineHeight: 1.55 }}>
                      {idSideError.message}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#9a4a54', marginTop: '0.5rem', fontStyle: 'italic' }}>
                      Both photos were cleared — please re-upload the correct front and back.
                    </div>
                  </div>
                </div>
              )}
              {ocrLoading && (
                <div style={{ background:'rgba(13,110,253,0.07)', border:'1.5px solid rgba(13,110,253,0.3)', borderRadius:'10px', padding:'0.85rem 1rem', marginBottom:'1rem', fontSize:'0.85rem', color:'#0d6efd', display:'flex', alignItems:'center', gap:'0.6rem', minHeight:'3.2rem' }}>
                  <Spinner animation="border" style={{ color:'#0d6efd', width:'1rem', height:'1rem', borderWidth:'0.15em', flexShrink:0 }} />
                  <span><strong>Scanning your ID…</strong> Please wait while we extract your information.</span>
                </div>
              )}
              {duplicateError && !ocrLoading && (
                <div style={{ background:'rgba(220,53,69,0.07)', border:'1.5px solid rgba(220,53,69,0.3)', borderRadius:'10px', padding:'0.85rem 1rem', marginBottom:'1rem', fontSize:'0.83rem', color:'#6b2530', display:'flex', alignItems:'flex-start', gap:'0.6rem', lineHeight:1.55 }}>
                  <i className="fas fa-user-lock" style={{ color:'#dc3545', marginTop:'0.15rem', flexShrink:0 }} />
                  <span><strong style={{ color:'#b02a37' }}>Account already verified.</strong> {duplicateError}</span>
                </div>
              )}
              {ocrDone && !ocrLoading && !duplicateError && (
                <div style={{ background:'rgba(25,135,84,0.07)', border:'1.5px solid rgba(25,135,84,0.3)', borderRadius:'10px', padding:'0.75rem 1rem', marginBottom:'1rem', fontSize:'0.82rem', color:'#198754', display:'flex', alignItems:'center', gap:'0.5rem' }}>
                  <i className="fas fa-check-circle" />
                  <span><strong>ID scanned successfully.</strong> Your information has been auto-filled. Please review before proceeding.</span>
                </div>
              )}

              <div style={{ background:'rgba(67,97,238,0.06)', border:'1.5px solid rgba(67,97,238,0.25)', borderRadius:'12px', padding:'1rem 1.1rem', marginBottom:'1.25rem', fontSize:'0.82rem', color:'#444' }}>
                <div style={{ fontWeight:'700', color:'#4361ee', marginBottom:'0.5rem', fontSize:'0.88rem' }}>
                  <i className="fas fa-lightbulb me-2" style={{ color:'#ffc107' }} />Tip for Muntinlupa Residents
                </div>
                <p style={{ marginBottom:'0.4rem', lineHeight: 1.6 }}>
                  If you are a <strong style={{ color:'#1a1a1a' }}>Muntinlupa City resident</strong> but your current valid ID does not show a Muntinlupa address, you can get a <strong style={{ color:'#4361ee' }}>Barangay ID</strong> from your local barangay hall — it's <strong style={{ color:'#1a1a1a' }}>free</strong> and will be accepted here.
                </p>
                <div style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', marginTop:'0.5rem', background:'rgba(255,193,7,0.08)', borderRadius:'8px', padding:'0.6rem 0.75rem' }}>
                  <i className="fas fa-check-circle" style={{ color:'#28a745', marginTop:'0.15rem', flexShrink:0 }} />
                  <span>A <strong>Barangay ID with your Muntinlupa address</strong> will qualify you for <strong style={{ color:'#28a745' }}>Full Verification</strong> status.</span>
                </div>
              </div>

              <Form.Group className="mb-3">
                <Form.Label style={ls}><i className="fas fa-id-badge me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />ID Type</Form.Label>
                <div style={{ ...es, background:'#e9ecef', color: idForm.valid_id_type ? '#1a1a1a' : '#9ca3af', display:'flex', alignItems:'center', gap:'0.5rem', cursor:'not-allowed' }}>
                  {idForm.valid_id_type
                    ? <><i className="fas fa-check-circle" style={{ color:'#198754' }} />{idForm.valid_id_type}</>
                    : <><i className="fas fa-magic" style={{ color:'#adb5bd' }} />Will be detected automatically after upload</>
                  }
                </div>
                {idForm.valid_id_type === 'Other' && (
                  <small style={{ color:'#f59e0b', display:'block', marginTop:'0.3rem', fontSize:'0.78rem' }}>
                    <i className="fas fa-exclamation-triangle me-1" />Couldn't confidently match a known ID type — it'll be reviewed manually.
                  </small>
                )}
              </Form.Group>

              <Row className="mb-3">
                {[
                  { label: 'ID Front', file: idFrontFile, preview: idFrontPreview, setter: setIdFrontFile, previewSetter: setIdFrontPreview },
                  { label: 'ID Back',  file: idBackFile,  preview: idBackPreview,  setter: setIdBackFile,  previewSetter: setIdBackPreview },
                ].map(({ label, preview, setter, previewSetter }) => (
                  <Col md={6} key={label}>
                    <Form.Group className="mb-3">
                      <Form.Label style={ls}>
                        <i className="fas fa-camera me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />
                        {label} <Req />
                      </Form.Label>
                      <label style={{ display:'block', cursor: verifySubmitting ? 'not-allowed' : 'pointer' }}>
                        <div
                          style={{ border:`2px dashed ${preview ? '#ffc107' : '#dee2e6'}`, borderRadius:'12px', padding:'1rem', textAlign:'center', background:'#f8f9fa', minHeight:'140px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}
                          onMouseOver={e => { if (!verifySubmitting) e.currentTarget.style.borderColor='#ffc107'; }}
                          onMouseOut={e  => e.currentTarget.style.borderColor = preview ? '#ffc107' : '#dee2e6'}
                        >
                          {preview
                            ? <img src={preview} alt={label} style={{ width:'100%', maxHeight:'110px', objectFit:'contain', borderRadius:'8px' }} />
                            : <><i className="fas fa-upload" style={{ fontSize:'1.5rem', color:'#ccc', marginBottom:'0.5rem' }} /><small style={{ color:'#888', fontSize:'0.78rem' }}>Click to upload</small></>
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
              <div style={{ background:'rgba(255,193,7,0.06)', border:'1.5px dashed #ffc107', borderRadius:'12px', padding:'0.85rem 1rem', marginBottom:'1.5rem', fontSize:'0.85rem', color:'#666' }}>
                <i className="fas fa-info-circle me-2" style={{ color:'#ffc107' }} />
                Fill in your details exactly as they appear on your registration. Your <strong style={{ color:'#1a1a1a' }}>name must match your uploaded ID</strong>.
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

              <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', margin:'0.75rem 0 1rem' }}>
                <i className="fas fa-map-marker-alt" style={{ color:'#ffc107', fontSize:'0.95rem' }} />
                <span style={{ fontWeight:'700', fontSize:'0.95rem', color:'#1a1a1a' }}>Address</span>
                <div style={{ flex:1, height:'1px', background:'rgba(0,0,0,0.08)', marginLeft:'0.5rem' }} />
              </div>

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
                <div style={{ background:'rgba(255,193,7,0.06)', border:'1.5px solid rgba(255,193,7,0.3)', borderRadius:'10px', padding:'0.75rem 1rem', marginBottom:'0.5rem', fontSize:'0.82rem', color:'#555' }}>
                  <i className="fas fa-map-marker-alt me-2" style={{ color:'#ffc107' }} />
                  <strong style={{ color:'#1a1a1a' }}>Address preview: </strong>
                  {[idForm.house_no, idForm.street, barangayList.find(b => b.psgcCode === idForm.barangay)?.name, cities.find(c => c.psgcCode === idForm.city)?.name, provinces.find(p => p.psgcCode === idForm.province)?.name].filter(Boolean).join(', ')}
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer style={{ padding:'1.25rem 2rem', borderTop:'1px solid #e9ecef' }}>
          {verifyStep === 1 ? (
            <>
              <Button variant="secondary" onClick={requestClose} disabled={verifySubmitting} style={{ borderRadius:'10px', padding:'0.75rem 1.5rem', fontWeight:'600' }}>Cancel</Button>              <Button onClick={handleVerifyStep1Next} disabled={verifySubmitting || ocrLoading || !ocrDone || !idFrontFile || !idBackFile || !!duplicateError} className="border-0"
                style={{ background: duplicateError ? '#adb5bd' : 'linear-gradient(135deg,#ffc107,#ffb300)', color: duplicateError ? '#6c757d' : '#000', borderRadius:'10px', padding:'0.75rem 1.75rem', fontWeight:'700', boxShadow: duplicateError ? 'none' : '0 4px 14px rgba(255,193,7,0.4)', cursor: duplicateError ? 'not-allowed' : 'pointer', opacity:(!ocrDone || !idFrontFile || !idBackFile) ? 0.6 : 1 }}>
                {ocrLoading ? <WaveDots /> : <>Next — Confirm Info <i className="fas fa-arrow-right ms-2" /></>}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setVerifyStep(1)} disabled={verifySubmitting} style={{ borderRadius:'10px', padding:'0.75rem 1.5rem', fontWeight:'600' }}><i className="fas fa-arrow-left me-2" />Back</Button>
              <Button onClick={handleVerifySubmit} disabled={verifySubmitting || !idForm.barangay || !idForm.street || !idForm.house_no} className="border-0"
                style={{ background:'linear-gradient(135deg,#ffc107,#ffb300)', color:'#000', borderRadius:'10px', padding:'0.75rem 1.75rem', fontWeight:'700', boxShadow:'0 4px 14px rgba(255,193,7,0.4)' }}>
                {verifySubmitting ? <WaveDots /> : <><i className="fas fa-paper-plane me-2" />Submit for Verification</>}
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* ── Post-submission Reviewing Modal ── */}
      <Modal show={showReviewingModal} onHide={() => {}} backdrop="static" keyboard={false} centered style={{ zoom: window.innerWidth >= 1920 ? 1 : window.innerWidth >= 1600 ? 0.9 : 0.75, zIndex:99999 }}>
        <Modal.Body style={{ padding:'2.5rem', background:'linear-gradient(135deg,#ffffff,#f8f9fa)', borderRadius:'20px', border:'1px solid rgba(255,193,7,0.2)', textAlign:'center' }}>
          <div style={{ width:'80px', height:'80px', borderRadius:'50%', background:'rgba(255,193,7,0.12)', border:'3px solid rgba(255,193,7,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.5rem', boxShadow:'0 8px 24px rgba(255,193,7,0.2)' }}>
            {reviewStep < 2
              ? <Spinner animation="border" style={{ color:'#ffc107', width:'2.2rem', height:'2.2rem', borderWidth:'3px' }} />
              : <i className="fas fa-check" style={{ fontSize:'2rem', color:'#198754' }} />
            }
          </div>
          <h5 style={{ fontWeight:'800', color:'#212529', marginBottom:'0.5rem', fontSize:'1.3rem' }}>
            {reviewStep === 0 && 'Submitting your ID…'}
            {reviewStep === 1 && 'Under Review'}
            {reviewStep === 2 && 'Submission Complete!'}
          </h5>
          <p style={{ fontSize:'0.9rem', color:'#6c757d', marginBottom:'2rem' }}>
            {reviewStep === 0 && 'Uploading your documents, please wait.'}
            {reviewStep === 1 && 'Our team is reviewing your documents. This usually takes 1–2 business days.'}
            {reviewStep === 2 && <span>Your ID has been submitted. You will be notified once verification is complete.</span>}
          </p>
          <div style={{ display:'flex', justifyContent:'center', gap:'0', marginBottom:'2rem', position:'relative' }}>
            <div style={{ position:'absolute', top:'15px', left:'calc(50% - 80px)', width:'160px', height:'2px', background:'#e9ecef', zIndex:0 }} />
            <div style={{ position:'absolute', top:'15px', left:'calc(50% - 80px)', width: reviewStep >= 1 ? (reviewStep >= 2 ? '160px' : '80px') : '0px', height:'2px', background:'#ffc107', transition:'width 0.8s ease', zIndex:1 }} />
            {[{ label:'Submitted', icon:'fa-paper-plane' }, { label:'Under Review', icon:'fa-search' }, { label:'Verified', icon:'fa-check-circle' }].map((s, i) => {
              const done = reviewStep > i, active = reviewStep === i;
              return (
                <div key={s.label} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'0.4rem', width:'100px', zIndex:2 }}>
                  <div style={{ width:'30px', height:'30px', borderRadius:'50%', background: done ? '#198754' : active ? '#ffc107' : '#e9ecef', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.5s', boxShadow: active ? '0 0 0 4px rgba(255,193,7,0.25)' : 'none' }}>
                    <i className={`fas ${s.icon}`} style={{ fontSize:'0.72rem', color:(done||active) ? '#fff' : '#aaa' }} />
                  </div>
                  <span style={{ fontSize:'0.68rem', fontWeight:'600', color: done ? '#198754' : active ? '#ffc107' : '#aaa', textAlign:'center', lineHeight:1.3 }}>{s.label}</span>
                </div>
              );
            })}
          </div>
          {reviewStep === 2 && (
            <Button onClick={() => { setShowReviewingModal(false); window.location.reload(); }}
              style={{ background:'linear-gradient(135deg,#ffc107,#ffb300)', border:'none', color:'#000', borderRadius:'12px', padding:'0.75rem 2rem', fontWeight:'700', fontSize:'1rem' }}>
              <i className="fas fa-check me-2" />Done
            </Button>
          )}
        </Modal.Body>
      </Modal>
            {/* ── Exit Confirmation Modal ── */}
      <Modal show={showExitConfirm} onHide={() => setShowExitConfirm(false)} centered style={{ zoom: window.innerWidth >= 1920 ? 1 : window.innerWidth >= 1600 ? 0.9 : 0.75, zIndex: 100000 }}>
        <Modal.Body style={{ padding:'2rem', textAlign:'center', borderRadius:'20px' }}>
          <div style={{ width:'64px', height:'64px', borderRadius:'50%', background:'rgba(220,53,69,0.1)', border:'2px solid rgba(220,53,69,0.25)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.25rem' }}>
            <i className="fas fa-exclamation-triangle" style={{ fontSize:'1.5rem', color:'#dc3545' }} />
          </div>
          <h5 style={{ fontWeight:'800', color:'#212529', marginBottom:'0.5rem' }}>Discard your progress?</h5>
          <p style={{ fontSize:'0.9rem', color:'#6c757d', marginBottom:'1.75rem' }}>
            You have unsaved verification details. If you leave now, your uploaded ID and form entries will be lost.
          </p>
          <div style={{ display:'flex', gap:'0.75rem', justifyContent:'center' }}>
            <Button variant="secondary" onClick={() => setShowExitConfirm(false)} style={{ borderRadius:'10px', padding:'0.65rem 1.5rem', fontWeight:'600' }}>
              Keep Editing
            </Button>
            <Button onClick={confirmClose} className="border-0" style={{ background:'#dc3545', color:'#fff', borderRadius:'10px', padding:'0.65rem 1.5rem', fontWeight:'700' }}>
              Discard & Exit
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default VerifyAccountModal;