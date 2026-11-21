import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Modal, Form } from 'react-bootstrap';
import { barangayAPI, handleAPIError } from '../../services/api';
import api from '../../services/api';

const clinicReportsAPI = {
  getMyReports: () => api.get('/reports/my-reports'),
  create:       (data) => api.post('/reports/create', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/reports/delete/${id}`),
};

// ─── Google Maps (same key as the Map Status page) ───────────────────────────
const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY;

// Muntinlupa City boundary (lat, lng)
const MUNTI_BOUNDARY = [
  [14.380313,121.058092],[14.382328,121.054788],[14.384199,121.054552],[14.384323,121.055496],
  [14.385904,121.055142],[14.386914,121.054015],[14.386963,121.0532],[14.388148,121.052942],
  [14.390019,121.052556],[14.390164,121.053114],[14.391713,121.053221],[14.392669,121.052889],
  [14.393433,121.052068],[14.396368,121.051472],[14.399425,121.051301],[14.40065,121.051215],
  [14.402261,121.052181],[14.404149,121.051397],[14.404939,121.051784],[14.405295,121.051719],
  [14.405552,121.051365],[14.407331,121.051258],[14.409898,121.051612],[14.409971,121.052374],
  [14.410335,121.052427],[14.411358,121.052417],[14.41181,121.052502],[14.413089,121.0532],
  [14.413837,121.053307],[14.415685,121.052191],[14.416704,121.052084],[14.41792,121.052792],
  [14.418154,121.052797],[14.418237,121.052674],[14.418263,121.052256],[14.419276,121.052191],
  [14.419632,121.052328],[14.419593,121.052489],[14.424831,121.052706],[14.42535,121.0535],
  [14.426306,121.053672],[14.427841,121.052384],[14.429733,121.051912],[14.430959,121.052127],
  [14.432842,121.052191],[14.433038,121.052095],[14.436177,121.052599],[14.436655,121.052513],
  [14.437153,121.052427],[14.437465,121.051805],[14.437839,121.051826],[14.439959,121.051655],
  [14.441912,121.051998],[14.442823,121.053843],[14.45118,121.054358],[14.453132,121.053071],
  [14.456874,121.055131],[14.457661,121.053886],[14.468591,121.05895],[14.467293,121.047878],
  [14.447434,121.037707],[14.443904,121.041012],[14.440206,121.036892],[14.442535,121.033287],
  [14.440374,121.028159],[14.437195,121.024296],[14.428103,121.02229],[14.423583,121.022387],
  [14.422648,121.022601],[14.42136,121.021936],[14.41897,121.02037],[14.407165,121.012387],
  [14.399018,121.011915],[14.392202,121.009727],[14.38713,121.006594],[14.382058,121.008224],
  [14.378973,121.011314],[14.372579,121.009598],[14.370087,121.00728],[14.364267,121.006594],
  [14.358777,121.007538],[14.35495,121.007366],[14.350629,121.005049],[14.346857,121.011486],
  [14.355202,121.021614],[14.363516,121.028309],[14.365846,121.029639],[14.365721,121.032643],
  [14.36651,121.036162],[14.371751,121.043329],[14.367504,121.048565],[14.380313,121.058092],
];

const isInsideMuntinlupa = (lat, lng) => {
  if (lat < 14.346 || lat > 14.469 || lng < 121.004 || lng > 121.059) return false;
  let inside = false;
  for (let i = 0, j = MUNTI_BOUNDARY.length - 1; i < MUNTI_BOUNDARY.length; j = i++) {
    const [xi, yi] = MUNTI_BOUNDARY[i];
    const [xj, yj] = MUNTI_BOUNDARY[j];
    const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// Outside the city: move the pin to the nearest boundary point
const snapToMuntinlupa = (lat, lng) => {
  if (isInsideMuntinlupa(lat, lng)) return [lat, lng];
  let best = MUNTI_BOUNDARY[0], min = Infinity;
  MUNTI_BOUNDARY.forEach(([pLat, pLng]) => {
    const d = (lat - pLat) ** 2 + (lng - pLng) ** 2;
    if (d < min) { min = d; best = [pLat, pLng]; }
  });
  return best;
};

// Rough centre points of Muntinlupa's 9 barangays — used only when Google doesn't name the barangay
const BRGY_POINTS = {
  'sucat':         [[14.4614, 121.0466]],
  'buli':          [[14.4447, 121.0503]],
  'cupang':        [[14.4316, 121.0475]],
  // Ayala Alabang is counted as Alabang
  'alabang':       [[14.4199, 121.0407], [14.4105, 121.0395], [14.4067, 121.0173], [14.4220, 121.0270], [14.3990, 121.0240]],
  'bayanan':       [[14.4053, 121.0473]],
  'putatan':       [[14.3960, 121.0367]],
  'poblacion':     [[14.3826, 121.0450]],
  'tunasan':       [[14.3687, 121.0369]],
};

// Picks the barangay for a pin: Google's area names first, nearest barangay centre as a fallback
const findBarangay = (barangays, areaStr, lat, lng) => {
  // Ayala Alabang is never picked: anything in Alabang / Ayala Alabang becomes "Alabang"
  const list = [...barangays]
    .filter(b => !/ayala\s+alabang/i.test(b.name))
    .sort((a, b) => b.name.length - a.name.length);
  const areas = (areaStr || '').toLowerCase().split(' | ')
    .map(a => a.trim().replace(/ayala\s+alabang/g, 'alabang'))
    .filter(Boolean);
  const norm = (t) => t.toLowerCase().replace(/^(brgy\.?|barangay)\s+/, '').trim();
  const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 1) Google's most specific area name that IS a barangay name (follows Google's order, not name length)
  for (const a of areas) {
    const hit = list.find(b => norm(b.name) === norm(a));
    if (hit) return hit;
  }
  // 2) An area name that contains a barangay name ("Alabang Hills" -> Alabang), most specific area first
  for (const a of areas) {
    const hit = list.find(b => new RegExp(`\\b${esc(norm(b.name))}\\b`).test(a));
    if (hit) return hit;
  }
  if (lat == null || lng == null) return null;
  let best = null, min = Infinity;
  list.forEach(b => {
    const pts = BRGY_POINTS[norm(b.name)];
    (pts || []).forEach(([pLat, pLng]) => {
      const d = (lat - pLat) ** 2 + (lng - pLng) ** 2;
      if (d < min) { min = d; best = b; }
    });
  });
  return best;
};

// Muntinlupa's rough box, used to keep search suggestions inside the city
const MUNTI_BOUNDS = { north: 14.47, south: 14.345, east: 121.06, west: 121.0 };

// Search suggestions while typing: buildings, malls, schools, landmarks and streets.
// Tries Places API (New), then the older Places API, then the Geocoder (streets/areas only).
const findPlaces = async (q, sessionRef, map) => {
  const gm = window.google?.maps;
  if (!gm) return [];
  try {
    const lib = gm.importLibrary ? await gm.importLibrary('places') : gm.places;
    if (lib?.AutocompleteSuggestion) {
      if (!sessionRef.current) sessionRef.current = new lib.AutocompleteSessionToken();
      const { suggestions } = await lib.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q,
        sessionToken: sessionRef.current,
        includedRegionCodes: ['ph'],
        locationRestriction: MUNTI_BOUNDS,
      });
      return (suggestions || []).map(x => x.placePrediction).filter(Boolean).slice(0, 6).map(p => ({
        main: p.mainText?.text || p.text?.text || '',
        sub: p.secondaryText?.text || '',
        resolve: async () => {
          const place = p.toPlace();
          await place.fetchFields({ fields: ['location'] });
          sessionRef.current = null;   // a pick ends the search session
          return { lat: place.location.lat(), lng: place.location.lng() };
        },
      }));
    }
  } catch (e) { /* Places API (New) not enabled on the key — try the older one */ }
  try {
    if (gm.places?.AutocompleteService) {
      const preds = await new Promise((res) => new gm.places.AutocompleteService().getPlacePredictions(
        { input: q, componentRestrictions: { country: 'ph' }, bounds: MUNTI_BOUNDS, strictBounds: true },
        (p, status) => res(status === 'OK' ? p : (status === 'ZERO_RESULTS' ? [] : null))
      ));
      if (preds) {
        return preds.slice(0, 6).map(p => ({
          main: p.structured_formatting?.main_text || p.description,
          sub: p.structured_formatting?.secondary_text || '',
          resolve: () => new Promise((res, rej) => new gm.places.PlacesService(map).getDetails(
            { placeId: p.place_id, fields: ['geometry'] },
            (d, st) => (st === 'OK' && d?.geometry
              ? res({ lat: d.geometry.location.lat(), lng: d.geometry.location.lng() })
              : rej(new Error(st)))
          )),
        }));
      }
    }
  } catch (e) { /* fall back to the Geocoder */ }
  try {
    const { results: found } = await new gm.Geocoder().geocode({
      address: /muntinlupa/i.test(q) ? q : `${q}, Muntinlupa City, Metro Manila`,
      componentRestrictions: { country: 'PH' },
      bounds: MUNTI_BOUNDS,
    });
    return (found || [])
      .map(r => ({ label: r.formatted_address, lat: r.geometry.location.lat(), lng: r.geometry.location.lng() }))
      .filter(r => isInsideMuntinlupa(r.lat, r.lng))
      .slice(0, 5)
      .map(r => {
        const parts = r.label.split(',');
        return { main: parts[0], sub: parts.slice(1).join(',').trim(), resolve: async () => ({ lat: r.lat, lng: r.lng }) };
      });
  } catch (e) { return []; }
};

// Loads the Google Maps script once and shares it with every map on the page
let googleMapsPromise = null;
const loadGoogleMaps = () => {
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (googleMapsPromise) return googleMapsPromise;
  googleMapsPromise = new Promise((resolve, reject) => {
    const done = () => (window.google?.maps?.Map ? resolve(window.google.maps) : reject(new Error('Google Maps did not load')));
    const fail = () => { googleMapsPromise = null; reject(new Error('Google Maps did not load')); };
    let script = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (script) {
      script.addEventListener('load', done);
      script.addEventListener('error', fail);
      return;
    }
    script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
    script.async = true;
    script.onload = done;
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return googleMapsPromise;
};

// Address + barangay names for a pinned point (Google Geocoding)
const reverseGeocode = (lat, lng, onAddressResolve, onBarangayDetect) => {
  const gm = window.google?.maps;
  if (!gm) return;
  new gm.Geocoder().geocode({ location: { lat, lng } })
    .then(({ results }) => {
      if (!results || !results.length) { onBarangayDetect && onBarangayDetect('', lat, lng); return; }
      const best = results.find(r => !r.types.includes('plus_code')) || results[0];
      const plusCode = results.find(r => r.plus_code)?.plus_code?.compound_code || null;
      onAddressResolve && onAddressResolve(best.formatted_address || '', plusCode, lat, lng);
      // Barangay usually comes back as a sublocality or neighborhood
      // Barangay-level names first (in Google's order: closest match first), village/neighbourhood names after
      const BRGY_TYPES = ['sublocality_level_1', 'administrative_area_level_5', 'sublocality'];
      const OTHER_TYPES = ['sublocality_level_2', 'neighborhood', 'administrative_area_level_4'];
      const top = results.slice(0, 4);
      const pick = (types) => top.flatMap(r => r.address_components)
        .filter(c => c.types.some(t => types.includes(t)))
        .map(c => c.long_name.toLowerCase());
      const areaNames = [...pick(BRGY_TYPES), ...pick(OTHER_TYPES)];
      onBarangayDetect && onBarangayDetect([...new Set(areaNames)].join(' | '), lat, lng);
    })
    .catch(() => { onBarangayDetect && onBarangayDetect('', lat, lng); });
};

const GoogleMapPicker = ({ lat, lng, onLocationSelect, onAddressResolve, onBarangayDetect, readOnly = false, onError, height }) => {
  const wrapRef   = useRef(null);   // sized box in the page
  const mapRef    = useRef(null);   // Google map, kept at zoom 1 inside the box
  const mapObj    = useRef(null);
  const markerRef = useRef(null);
  const lastPinRef = useRef(null);  // last point pinned by clicking, so the view doesn't jump
  const [ready, setReady] = useState(!!window.google?.maps?.Map);
  const [mapError, setMapError] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Keep the latest callbacks without re-creating the map
  const cbRef = useRef({});
  cbRef.current = { onLocationSelect, onAddressResolve, onBarangayDetect, onError };

  useEffect(() => {
    if (ready) return;
    let alive = true;
    loadGoogleMaps()
      .then(() => alive && setReady(true))
      .catch(() => alive && setMapError('Failed to load the map. Check your connection and try again.'));
    return () => { alive = false; };
  }, [ready]);

  const placeMarker = (pLat, pLng) => {
    const gm = window.google.maps;
    if (markerRef.current) markerRef.current.setPosition({ lat: pLat, lng: pLng });
    else markerRef.current = new gm.Marker({ position: { lat: pLat, lng: pLng }, map: mapObj.current });
  };

  const pinAt = (pLat, pLng) => {
    lastPinRef.current = { lat: pLat, lng: pLng };
    placeMarker(pLat, pLng);
    const cb = cbRef.current;
    cb.onLocationSelect && cb.onLocationSelect(pLat, pLng);
    reverseGeocode(pLat, pLng, cb.onAddressResolve, cb.onBarangayDetect);
  };

  useEffect(() => {
    if (!ready || !mapRef.current || mapObj.current) return;
    const gm = window.google.maps;
    const map = new gm.Map(mapRef.current, {
      center: { lat: lat || 14.4081, lng: lng || 121.0415 },
      zoom: lat && lng ? 16 : 13,
      minZoom: 12,
      restriction: { latLngBounds: { north: 14.50, south: 14.34, east: 121.12, west: 120.97 }, strictBounds: false },
      mapTypeControl: false,
      cameraControl: false,      // the round move/zoom ("remote") button
      streetViewControl: false,
      fullscreenControl: false,
      clickableIcons: false,
      gestureHandling: readOnly ? 'cooperative' : 'greedy',
      // Pointing finger when hovering (click once to pin), closed hand only while holding and dragging
      draggableCursor: readOnly ? undefined : 'pointer',
      draggingCursor: 'grabbing',
    });
    mapObj.current = map;

    new gm.Polygon({
      paths: MUNTI_BOUNDARY.map(([pLat, pLng]) => ({ lat: pLat, lng: pLng })),
      strokeColor: '#ffc107', strokeOpacity: 0.9, strokeWeight: 2.5,
      fillColor: '#ffc107', fillOpacity: 0.04,
      clickable: false, map,
    });

    if (lat && lng) placeMarker(lat, lng);

    if (!readOnly) {
      map.addListener('click', (e) => {
        const [pLat, pLng] = snapToMuntinlupa(e.latLng.lat(), e.latLng.lng());
        pinAt(pLat, pLng);
      });
    }

    return () => {
      if (markerRef.current) markerRef.current.setMap(null);
      gm.event.clearInstanceListeners(map);
      mapObj.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  // Pin moved from outside (typed address, "clear pin")
  useEffect(() => {
    if (!mapObj.current) return;
    if (lat && lng) {
      placeMarker(lat, lng);
      // Only move the view when the pin came from outside (typed address), not from a click on the map
      const last = lastPinRef.current;
      if (!last || last.lat !== lat || last.lng !== lng) mapObj.current.panTo({ lat, lng });
    } else if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng]);

  // The page and modals use CSS zoom (0.75 / 0.9). Google Maps reads clicks wrong under zoom,
  // so the map itself is kept at zoom 1 and sized to fill the box exactly.
  useEffect(() => {
    const wrap = wrapRef.current, inner = mapRef.current;
    if (!wrap || !inner) return;
    const fit = () => {
      const r = wrap.getBoundingClientRect();
      let z = 1;
      for (let el = wrap; el; el = el.parentElement) z *= parseFloat(getComputedStyle(el).zoom) || 1;
      inner.style.zoom = Math.abs(z - 1) < 0.01 ? '' : String(1 / z);
      inner.style.width = `${r.width}px`;
      inner.style.height = `${r.height}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [isFullscreen]);

  // Short message shown on top of the map (e.g. "you're outside Muntinlupa")
  const [notice, setNotice] = useState(null);
  const noticeTimer = useRef(null);
  const showNotice = (text, kind = 'error') => {
    // If the page shows its own error (onError), use that; otherwise show it on the map
    if (kind === 'error' && cbRef.current.onError) { cbRef.current.onError(text); return; }
    clearTimeout(noticeTimer.current);
    setNotice({ text, kind });
    noticeTimer.current = setTimeout(() => setNotice(null), 5000);
  };
  useEffect(() => () => clearTimeout(noticeTimer.current), []);

  const [locating, setLocating] = useState(false);

  // ── Search: suggestions appear while typing; picking one moves, zooms and pins the map ──
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);   // a lookup finished (to show "nothing found")
  const [active, setActive] = useState(-1);          // highlighted suggestion (arrow keys)
  const searchTimer = useRef(null);
  const searchSeq = useRef(0);
  const sessionRef = useRef(null);
  useEffect(() => () => clearTimeout(searchTimer.current), []);

  const closeResults = () => { setResults([]); setSearched(false); setActive(-1); };

  const goTo = (pLat, pLng) => {
    if (!mapObj.current) return;
    mapObj.current.setCenter({ lat: pLat, lng: pLng });
    mapObj.current.setZoom(17);
    pinAt(pLat, pLng);
    closeResults();
    setNotice(null);
  };

  const onQueryChange = (val) => {
    setQuery(val);
    setActive(-1);
    clearTimeout(searchTimer.current);
    const q = val.trim();
    if (q.length < 2) { searchSeq.current++; setSearching(false); closeResults(); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const seq = ++searchSeq.current;
      const list = await findPlaces(q, sessionRef, mapObj.current);
      if (seq !== searchSeq.current) return;   // a newer search already started
      setResults(list);
      setSearched(true);
      setSearching(false);
    }, 300);
  };

  const clearSearch = () => {
    clearTimeout(searchTimer.current);
    searchSeq.current++;
    setQuery('');
    setSearching(false);
    closeResults();
  };

  const pickResult = async (r) => {
    if (!r) return;
    clearTimeout(searchTimer.current);
    searchSeq.current++;
    setSearching(true);
    try {
      const { lat: pLat, lng: pLng } = await r.resolve();
      if (!isInsideMuntinlupa(pLat, pLng)) {
        closeResults();
        showNotice(`"${r.main}" is outside Muntinlupa City. Only places inside Muntinlupa can be pinned.`);
        return;
      }
      setQuery(r.main);
      goTo(pLat, pLng);
    } catch (e) {
      showNotice("We couldn't open that place. Try another one or tap the map.");
    } finally {
      setSearching(false);
    }
  };

  const useMyLocation = () => {
    if (locating) return;
    if (!navigator.geolocation) { showNotice('Your browser does not support location access.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const { latitude, longitude } = pos.coords;
        if (!isInsideMuntinlupa(latitude, longitude)) {
          showNotice("You're outside Muntinlupa City. Only locations inside Muntinlupa can be pinned — tap the map to pin the place instead.");
          return;
        }
        if (!mapObj.current) return;
        mapObj.current.setCenter({ lat: latitude, lng: longitude });
        mapObj.current.setZoom(17);
        pinAt(latitude, longitude);
        setNotice(null);
      },
      (err) => {
        setLocating(false);
        showNotice(err && err.code === 1
          ? 'Location access is blocked. Allow it in your browser settings, or tap the map to pin the place.'
          : "We couldn't get your location. Try again or tap the map to pin the place.");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  if (mapError) return (
    <div style={{ background: '#fff5f5', borderRadius: '8px', padding: '1rem', color: '#dc3545', fontSize: '0.88rem' }}>
      <i className="fas fa-exclamation-circle me-2" />{mapError}
    </div>
  );

  return (
    <div style={{
      position: isFullscreen ? 'fixed' : 'relative',
      inset: isFullscreen ? 0 : 'auto',
      zIndex: isFullscreen ? 9999 : 'auto',
      background: isFullscreen ? '#fff' : 'transparent',
      padding: isFullscreen ? '1rem' : 0,
      display: 'flex',
      flexDirection: 'column',
    }}>
      <style>{`
        @keyframes gmShimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
        @keyframes gmNotice { from { opacity: 0; transform: translate(-50%, -6px); } to { opacity: 1; transform: translate(-50%, 0); } }
        .gm-ctrl { position: absolute; z-index: 5; width: 40px; height: 40px; border: none; border-radius: 10px; background: #fff; color: #3c4043;
          display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 1px 4px rgba(0,0,0,0.25), 0 2px 10px rgba(0,0,0,0.08);
          transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
        .gm-ctrl:hover { background: #f8f9fa; color: #1f2328; box-shadow: 0 2px 6px rgba(0,0,0,0.3), 0 4px 14px rgba(0,0,0,0.1); }
        .gm-ctrl:active { background: #f1f3f4; }
        .gm-ctrl:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }
        .gm-ctrl:disabled { cursor: progress; }
        .gm-ctrl i { font-size: 0.95rem; }
        .gm-ctrl.locate i { color: #1a73e8; }
        .gm-notice { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); z-index: 6; width: max-content; max-width: calc(100% - 120px);
          display: flex; align-items: flex-start; gap: 0.55rem; padding: 0.6rem 0.75rem; border-radius: 10px; font-size: 0.8rem; line-height: 1.45;
          background: #fff; color: #842029; border: 1px solid rgba(220,53,69,0.3); box-shadow: 0 6px 20px rgba(16,24,40,0.18); animation: gmNotice 0.2s ease-out; }
        .gm-notice > i { color: #dc3545; margin-top: 2px; }
        .gm-notice button { border: none; background: transparent; color: #9ca3af; padding: 0 0 0 0.25rem; line-height: 1; }
        .gm-notice button:hover { color: #1f2328; }
        .gm-search { position: absolute; top: 10px; left: 10px; right: 62px; z-index: 6; max-width: 420px; }
        .gm-search-box { display: flex; align-items: center; gap: 0.5rem; height: 40px; padding: 0 0.35rem 0 0.75rem; background: #fff; border-radius: 10px;
          box-shadow: 0 1px 4px rgba(0,0,0,0.25), 0 2px 10px rgba(0,0,0,0.08); }
        .gm-search-box:focus-within { box-shadow: 0 0 0 2px #ffc107, 0 2px 10px rgba(0,0,0,0.12); }
        .gm-search-box > .fa-search { color: #9ca3af; font-size: 0.85rem; }
        .gm-search-box input { flex: 1; min-width: 0; border: none; outline: none; background: transparent; font-size: 0.88rem; color: #1f2328; }
        .gm-search-box input::placeholder { color: #9ca3af; }
        .gm-search-busy { color: #e0a800; font-size: 0.85rem; }
        .gm-search-clear { border: none; background: transparent; color: #9ca3af; width: 26px; height: 26px; border-radius: 7px; }
        .gm-search-clear:hover { background: #f3f4f6; color: #1f2328; }
        .gm-search-results { margin-top: 6px; background: #fff; border-radius: 10px; box-shadow: 0 8px 24px rgba(16,24,40,0.18); overflow: hidden; }
        .gm-search-results button { display: flex; align-items: flex-start; gap: 0.55rem; width: 100%; padding: 0.55rem 0.8rem; border: none; border-top: 1px solid #f3f4f6;
          background: #fff; text-align: left; font-size: 0.82rem; color: #1f2328; line-height: 1.4; }
        .gm-search-results button:first-child { border-top: none; }
        .gm-search-results button:hover, .gm-search-results button.active { background: #fffbeb; }
        .gm-search-results button b { display: block; font-weight: 600; }
        .gm-search-results button .gm-sub { display: block !important; color: #6b7280; font-size: 0.74rem; }
        .gm-search-empty { padding: 0.7rem 0.85rem; font-size: 0.8rem; color: #6b7280; }
        .gm-search-results button i { color: #dc3545; margin-top: 3px; }
        .gm-notice { top: 60px; }
        @media (max-width: 576px) { .gm-notice { max-width: calc(100% - 24px); top: 60px; } }
      `}</style>

      <div ref={wrapRef} style={{
        position: 'relative',
        height: isFullscreen ? '100%' : (height || (readOnly ? '250px' : '400px')),
        width: '100%',
        aspectRatio: isFullscreen || height ? 'auto' : (readOnly ? 'auto' : '1 / 1'),
        borderRadius: '8px',
        overflow: 'hidden',
        flex: isFullscreen ? 1 : 'auto',
      }}>
        <div ref={mapRef} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} />

        {!readOnly && ready && (
          <div className="gm-search">
            <div className="gm-search-box">
              <i className="fas fa-search" />
              <input
                type="text"
                value={query}
                placeholder="Search a place, street or landmark…"
                aria-label="Search a place on the map"
                onChange={(e) => onQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {   // don't submit the form; pick the highlighted (or first) suggestion
                    e.preventDefault();
                    if (results.length) pickResult(results[active >= 0 ? active : 0]);
                  }
                  if (e.key === 'ArrowDown' && results.length) { e.preventDefault(); setActive(a => (a + 1) % results.length); }
                  if (e.key === 'ArrowUp' && results.length) { e.preventDefault(); setActive(a => (a <= 0 ? results.length - 1 : a - 1)); }
                  if (e.key === 'Escape') closeResults();
                }}
              />
              {searching
                ? <i className="fas fa-circle-notch fa-spin gm-search-busy" />
                : query && (
                  <button type="button" className="gm-search-clear" onClick={clearSearch} aria-label="Clear search">
                    <i className="fas fa-times" />
                  </button>
                )}
            </div>
            {(results.length > 0 || (searched && !searching && query.trim().length >= 2)) && (
              <div className="gm-search-results" role="listbox">
                {results.length > 0 ? results.map((r, idx) => (
                  <button
                    key={idx}
                    type="button"
                    role="option"
                    aria-selected={idx === active}
                    className={idx === active ? 'active' : ''}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => pickResult(r)}
                  >
                    <i className="fas fa-map-marker-alt" />
                    <span><b>{r.main}</b>{r.sub && <span className="gm-sub">{r.sub}</span>}</span>
                  </button>
                )) : (
                  <div className="gm-search-empty">No places found in Muntinlupa City. Try another name or tap the map.</div>
                )}
              </div>
            )}
          </div>
        )}

        {!ready && (
          <div aria-label="Loading map" style={{
            position: 'absolute', inset: 0, zIndex: 1,
            background: 'linear-gradient(90deg, #f0f0f0 25%, #e4e4e4 50%, #f0f0f0 75%)',
            backgroundSize: '800px 100%', animation: 'gmShimmer 1.4s ease-in-out infinite',
          }} />
        )}

        {notice && (
          <div className="gm-notice" role="alert">
            <i className="fas fa-exclamation-circle" />
            <span>{notice.text}</span>
            <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss"><i className="fas fa-times" /></button>
          </div>
        )}

        <button
          type="button"
          className="gm-ctrl"
          onClick={() => setIsFullscreen(f => !f)}
          style={{ top: 10, right: 10 }}
          title={isFullscreen ? 'Exit full screen' : 'Full screen'}
          aria-label={isFullscreen ? 'Exit full screen' : 'Full screen'}
        >
          <i className={`fas ${isFullscreen ? 'fa-compress-alt' : 'fa-expand-alt'}`} />
        </button>

        {!readOnly && (
          <button
            type="button"
            className="gm-ctrl locate"
            onClick={useMyLocation}
            disabled={locating}
            style={{ bottom: 28, right: 10 }}
            title="Pin my current location"
            aria-label="Pin my current location"
          >
            <i className={`fas ${locating ? 'fa-circle-notch fa-spin' : 'fa-crosshairs'}`} />
          </button>
        )}
      </div>

      {!readOnly && (
        <small style={{ display: 'block', marginTop: '0.4rem', color: '#888', fontSize: '0.78rem' }}>
          <i className="fas fa-mouse-pointer me-1" />Click on the map to pin the exact location
        </small>
      )}
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────
const ClinicReports = () => {
  const [reports,       setReports]       = useState([]);
  const [barangays,     setBarangays]     = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [successMsg,    setSuccessMsg]    = useState('');
  const [showModal,     setShowModal]     = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showDropdown,    setShowDropdown]    = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal,   setShowEditModal]   = useState(false);
  const [reportToDelete,  setReportToDelete]  = useState(null);
  const [reportToEdit,    setReportToEdit]    = useState(null);
  const [deleteLoading,   setDeleteLoading]   = useState(false);
  const [editLoading,     setEditLoading]     = useState(false);
  const [editError,       setEditError]       = useState('');
  const [editData,        setEditData]        = useState({ address:'', phone_number:'', description:'' });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError,   setSubmitError]   = useState('');
  const [locationError, setLocationError] = useState('');
  const [imageFiles,    setImageFiles]    = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [formLat, setFormLat] = useState(null);
  const [formLng, setFormLng] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    barangay_id: '',
    address: '',
    phone_number: '',
    description: '',
  });

  const styles = `
    @keyframes dropDown { 0%{opacity:0;transform:translateY(-30px)} 100%{opacity:1;transform:translateY(0)} }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    @media (max-width: 768px) {
      .rep-title { font-size: 1.3rem !important; }
      .rep-subtitle { font-size: 0.78rem !important; }
      .rep-header-btn { padding: 0.5rem 0.9rem !important; font-size: 0.8rem !important; border-radius: 8px !important; }
      .rep-header-row { flex-direction: column !important; align-items: flex-start !important; gap: 0.75rem !important; }
      .rep-card-body { padding: 1rem !important; }
      .rep-card-header { padding: 0.85rem 1rem !important; }
      .rep-card-icon { width: 44px !important; height: 44px !important; font-size: 1.3rem !important; }
      .rep-modal-body { padding: 1.25rem !important; }
    }

    /* ---------------- My Reports ---------------- */
    @keyframes rpIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes rpMenu { from { opacity: 0; transform: translateY(-6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    @keyframes rpShimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }
    @keyframes rpToast { from { opacity: 0; transform: translate(-50%, -12px); } to { opacity: 1; transform: translate(-50%, 0); } }
    .rp-anim { animation: rpIn 0.45s ease-out backwards; animation-delay: var(--d, 0s); }

    .rp-title { font-weight: 700; color: #1f2328; font-size: 1.85rem; margin: 0; }
    .rp-sub { color: #6b7280; font-size: 0.95rem; margin: 0.15rem 0 0; }

    .rp-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; border-radius: 10px; border: 1px solid transparent; font-weight: 600; font-size: 0.85rem; padding: 0.5rem 0.95rem; white-space: nowrap; transition: background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
    .rp-btn.lg { padding: 0.7rem 1.25rem; font-size: 0.92rem; }
    .rp-btn.sm { padding: 0.42rem 0.8rem; font-size: 0.8rem; }
    .rp-btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .rp-btn.primary { background: #ffc107; color: #1f2328; }
    .rp-btn.primary:hover:not(:disabled) { background: #f0b400; box-shadow: 0 6px 16px rgba(255,193,7,0.35); transform: translateY(-1px); }
    .rp-btn.ghost { background: #fff; color: #1f2328; border-color: #e5e7eb; }
    .rp-btn.ghost:hover:not(:disabled) { background: #fff8e1; border-color: #ffc107; }
    .rp-btn.amber { background: rgba(255,193,7,0.16); color: #8a6700; }
    .rp-btn.amber:hover:not(:disabled) { background: rgba(255,193,7,0.28); }
    .rp-btn.success { background: #198754; color: #fff; }
    .rp-btn.success:hover:not(:disabled) { background: #157347; }
    .rp-btn.danger-outline { background: #fff; color: #dc3545; border-color: rgba(220,53,69,0.35); }
    .rp-btn.danger-outline:hover:not(:disabled) { background: rgba(220,53,69,0.06); }

    .rp-tabs { display: inline-flex; gap: 0.25rem; padding: 4px; border-radius: 12px; background: #f3f4f6; align-self: flex-start; max-width: 100%; overflow-x: auto; }
    .rp-tab { display: inline-flex; align-items: center; gap: 0.5rem; border: none; background: transparent; padding: 0.5rem 0.95rem; border-radius: 9px; font-size: 0.86rem; font-weight: 600; color: #5b6270; white-space: nowrap; transition: background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease; }
    .rp-tab i { font-size: 0.8rem; }
    .rp-tab .count { font-size: 0.72rem; padding: 0.05rem 0.45rem; border-radius: 999px; background: rgba(0,0,0,0.06); color: #6b7280; }
    .rp-tab:hover { color: #1f2328; }
    .rp-tab.on { background: #fff; color: #1f2328; box-shadow: 0 1px 3px rgba(16,24,40,0.12); }
    .rp-tab.active.on i { color: #e0a800; }
    .rp-tab.archived.on i { color: #b88a00; }
    .rp-tab.trash.on i { color: #dc3545; }
    .rp-tab.on .count { background: #1f2328; color: #fff; }

    .rp-toast { position: fixed; top: 84px; left: 50%; transform: translateX(-50%); z-index: 99999; min-width: 320px; max-width: 480px; display: flex; align-items: center; gap: 0.75rem; padding: 0.85rem 1rem; background: #fff; border: 1px solid #e9ecef; border-left: 4px solid #198754; border-radius: 12px; box-shadow: 0 16px 40px rgba(16,24,40,0.16); animation: rpToast 0.35s ease-out; }
    .rp-toast .ic { width: 34px; height: 34px; border-radius: 50%; background: rgba(25,135,84,0.12); color: #198754; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rp-toast .t { font-weight: 700; color: #1f2328; font-size: 0.92rem; }
    .rp-toast .d { color: #6b7280; font-size: 0.84rem; }
    .rp-toast-close { border: none; background: transparent; color: #9ca3af; width: 28px; height: 28px; border-radius: 7px; }
    .rp-toast-close:hover { background: #f3f4f6; color: #1f2328; }

    .rp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 1.1rem; }
    .rp-card { position: relative; display: flex; flex-direction: column; background: #fff; border: 1px solid #e9ecef; border-radius: 16px; padding: 1.15rem; transition: box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease; }
    .rp-card:hover { box-shadow: 0 12px 28px rgba(16,24,40,0.08); transform: translateY(-3px); border-color: #e2e5ea; }
    .rp-card.raised { z-index: 5; }
    .rp-card.muted { background: #fcfcfd; }
    .rp-card.muted:hover { transform: none; }

    .rp-top { display: flex; align-items: center; gap: 0.9rem; margin-bottom: 0.85rem; }
    .rp-photo { position: relative; width: 64px; height: 64px; border-radius: 14px; overflow: hidden; flex-shrink: 0; background: #f6f7f9; border: 1px solid #eef0f3; cursor: pointer; }
    .rp-photo.static { cursor: default; }
    .rp-photo img { width: 100%; height: 100%; object-fit: cover; }
    .rp-photo-hover { position: absolute; inset: 0; background: rgba(0,0,0,0.4); color: #fff; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s ease; }
    .rp-photo:hover .rp-photo-hover, .rp-photo:focus-visible .rp-photo-hover { opacity: 1; }
    .rp-photo-cam { position: absolute; right: 4px; bottom: 4px; width: 20px; height: 20px; border-radius: 50%; background: #ffc107; color: #1f2328; display: flex; align-items: center; justify-content: center; font-size: 0.55rem; box-shadow: 0 1px 4px rgba(0,0,0,0.25); }
    .rp-photo-busy { position: absolute; inset: 0; background: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center; }
    .rp-name { font-weight: 700; font-size: 1.08rem; color: #1f2328; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rp-reg { font-size: 0.78rem; color: #6b7280; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .rp-reg i { font-size: 0.65rem; margin-right: 0.3rem; color: #9ca3af; }
    .rp-breed { font-size: 0.8rem; color: #6b7280; margin-top: 0.1rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .rp-breed .dot { margin: 0 0.35rem; color: #c4c9d0; }

    .rp-icon-btn { width: 34px; height: 34px; border-radius: 9px; border: 1px solid transparent; background: transparent; color: #6b7280; display: flex; align-items: center; justify-content: center; transition: background 0.15s ease, border-color 0.15s ease; }
    .rp-icon-btn:hover, .rp-icon-btn.on { background: #f3f4f6; border-color: #e5e7eb; color: #1f2328; }
    .rp-menu { position: absolute; top: calc(100% + 6px); right: 0; min-width: 210px; background: #fff; border: 1px solid #e9ecef; border-radius: 12px; box-shadow: 0 16px 36px rgba(16,24,40,0.14); padding: 0.35rem; z-index: 1000; animation: rpMenu 0.16s ease-out; transform-origin: top right; }
    .rp-menu-item { display: flex; align-items: center; gap: 0.65rem; width: 100%; padding: 0.55rem 0.7rem; border: none; border-radius: 8px; background: transparent; color: #1f2328; font-size: 0.86rem; font-weight: 500; text-align: left; }
    .rp-menu-item i { width: 16px; text-align: center; color: #6b7280; font-size: 0.82rem; }
    .rp-menu-item:hover:not(:disabled) { background: #f6f7f9; }
    .rp-menu-item:disabled { opacity: 0.5; }
    .rp-menu-item.warn, .rp-menu-item.warn i { color: #8a6700; }
    .rp-menu-item.warn:hover { background: #fff8e1; }
    .rp-menu-item.danger, .rp-menu-item.danger i { color: #dc3545; }
    .rp-menu-item.danger:hover { background: #fff5f5; }
    .rp-menu-sep { height: 1px; background: #f0f1f3; margin: 0.3rem 0.2rem; }
    .rp-menu-note { display: flex; gap: 0.5rem; padding: 0.55rem 0.7rem; margin-top: 0.15rem; border-radius: 8px; background: #fafbfc; color: #6b7280; font-size: 0.75rem; line-height: 1.45; }
    .rp-menu-note i { margin-top: 2px; color: #9ca3af; }

    .rp-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.85rem; }
    .rp-chip { display: inline-flex; align-items: center; gap: 0.3rem; font-size: 0.72rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; white-space: nowrap; }
    .rp-chip i { font-size: 0.65rem; }
    .rp-chip.green { background: rgba(25,135,84,0.1); color: #198754; }
    .rp-chip.grey { background: #f3f4f6; color: #6b7280; }
    .rp-chip.teal { background: rgba(10,162,192,0.1); color: #0a8aa3; }
    .rp-chip.pink { background: rgba(214,51,132,0.1); color: #c02a74; }
    .rp-chip.amber { background: rgba(255,193,7,0.16); color: #8a6700; }
    .rp-chip.red { background: rgba(220,53,69,0.1); color: #dc3545; }

    .rp-info { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1rem; padding: 0.85rem 0.95rem; border-radius: 12px; background: #fafbfc; border: 1px solid #f0f1f3; }
    .rp-info .k { font-size: 0.68rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.1rem; }
    .rp-info .v { font-size: 0.88rem; font-weight: 600; color: #1f2328; }
    .rp-last { display: flex; align-items: center; gap: 0.45rem; margin-top: 0.7rem; font-size: 0.8rem; color: #6b7280; }
    .rp-last i { color: #e0a800; font-size: 0.75rem; }
    .rp-last strong { color: #1f2328; font-weight: 600; }
    .rp-foot { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: auto; padding-top: 0.9rem; }
    .rp-card .rp-info + .rp-foot, .rp-card .rp-last + .rp-foot { margin-top: auto; }
    .rp-card > .rp-foot { border-top: 1px solid #f0f1f3; margin-top: 0.9rem; }
    .rp-muted { font-size: 0.78rem; color: #6b7280; }

    .rp-note { display: flex; align-items: center; gap: 0.55rem; padding: 0.65rem 0.9rem; border-radius: 10px; font-size: 0.84rem; font-weight: 500; margin-bottom: 1rem; }
    .rp-note.warn { background: rgba(255,193,7,0.1); color: #8a6700; }
    .rp-note.danger { background: rgba(220,53,69,0.07); color: #b02a37; }

    .rp-empty { text-align: center; padding: 3.5rem 1.5rem; border: 1px dashed #e2e5ea; border-radius: 16px; background: #fcfcfd; }
    .rp-empty .ic { width: 68px; height: 68px; border-radius: 18px; margin: 0 auto 1rem; background: rgba(255,193,7,0.14); color: #e0a800; display: flex; align-items: center; justify-content: center; font-size: 1.7rem; }
    .rp-empty h5 { font-weight: 700; color: #1f2328; margin-bottom: 0.35rem; }
    .rp-empty p { color: #6b7280; font-size: 0.9rem; max-width: 420px; margin: 0 auto 1.25rem; }
    .rp-empty p:last-child { margin-bottom: 0; }

    .rp-skel-card { min-height: 220px; }
    .rp-skel { border-radius: 8px; background: linear-gradient(90deg, #f3f4f6 25%, #e9ebee 37%, #f3f4f6 63%); background-size: 400% 100%; animation: rpShimmer 1.3s ease infinite; }

    .rp-pager { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; margin-top: 1.5rem; }
    .rp-pager-text { font-size: 0.85rem; color: #6b7280; }
    .rp-pager-text strong { color: #1f2328; }
    .rp-page { display: inline-flex; align-items: center; justify-content: center; min-width: 36px; height: 36px; padding: 0 0.6rem; border-radius: 9px; border: 1px solid transparent; background: transparent; font-size: 0.85rem; font-weight: 600; color: #4b5563; transition: background 0.15s ease; }
    .rp-page:hover:not(:disabled) { background: #f3f4f6; }
    .rp-page.on { background: #ffc107; color: #1f2328; }
    .rp-page.nav { border-color: #e5e7eb; background: #fff; font-size: 0.75rem; }
    .rp-page:disabled { opacity: 0.4; cursor: not-allowed; }

    .rp-btn:focus-visible, .rp-tab:focus-visible, .rp-icon-btn:focus-visible, .rp-menu-item:focus-visible, .rp-page:focus-visible, .rp-photo:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    @media (max-width: 768px) {
      .rp-title { font-size: 1.45rem; }
      .rp-sub { font-size: 0.85rem; }
      .rp-grid { grid-template-columns: 1fr; gap: 0.85rem; }
      .rp-card { padding: 0.95rem; }
      .rp-photo { width: 56px; height: 56px; }
      .rp-toast { min-width: 0; width: calc(100% - 2rem); top: 76px; }
      .rp-tab { padding: 0.45rem 0.7rem; font-size: 0.8rem; }
    }
    @media (prefers-reduced-motion: reduce) {
      .rp-anim, .rp-menu, .rp-toast, .rp-skel { animation: none !important; }
      .rp-card, .rp-btn { transition: none !important; }
    }
    .rp-chip { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.74rem; font-weight: 700; padding: 0.22rem 0.65rem; border-radius: 999px; white-space: nowrap; }
    .rp-chip i { font-size: 0.68rem; }
    .rp-card { border-top: 3px solid var(--t, #e9ecef); }
    .rp-type-ic { width: 56px; height: 56px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .rp-type-ic img { width: 32px; height: 32px; object-fit: contain; }
    .rp-type { font-weight: 700; font-size: 1.05rem; color: #1f2328; }
    .rp-num { font-size: 0.78rem; color: #6b7280; font-weight: 600; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .rp-num i { font-size: 0.65rem; margin-right: 0.3rem; color: #9ca3af; }
    .rp-info { display: flex; flex-direction: column; gap: 0.6rem; padding: 0.8rem 0.95rem; border-radius: 12px; background: #fafbfc; border: 1px solid #f0f1f3; }
    .rp-info .row-i { display: flex; align-items: flex-start; gap: 0.65rem; }
    .rp-info .row-i > i { width: 16px; text-align: center; color: #9ca3af; font-size: 0.8rem; margin-top: 3px; }
    .rp-info .v { font-size: 0.88rem; font-weight: 600; color: #1f2328; }
    .rp-info .s { font-size: 0.78rem; color: #6b7280; }
    .rp-ellipsis { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .rp-desc { margin: 0.75rem 0 0; font-size: 0.85rem; color: #4b5563; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .rp-filters { display: flex; gap: 0.4rem; overflow-x: auto; padding-bottom: 0.25rem; scrollbar-width: thin; }
    .rp-filter { flex-shrink: 0; display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.42rem 0.85rem; border-radius: 999px; border: 1px solid #e5e7eb; background: #fff; color: #4b5563; font-size: 0.82rem; font-weight: 600; transition: all 0.15s ease; }
    .rp-filter .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); display: inline-block; }
    .rp-filter .count { font-size: 0.72rem; background: #f3f4f6; color: #6b7280; border-radius: 999px; padding: 0.02rem 0.45rem; }
    .rp-filter:hover { border-color: #c4c9d0; color: #1f2328; }
    .rp-filter.on { background: #1f2328; border-color: #1f2328; color: #fff; }
    .rp-filter.on .count { background: rgba(255,255,255,0.2); color: #fff; }
    .rp-filter:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    /* ---------------- Responsive: every screen size ---------------- */
    /* Small laptops (992–1199px): 3 cards per row */
    @media (min-width: 992px) and (max-width: 1199.98px) {
      .rp-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    }
    /* Tablets (577–991px): 2 cards per row */
    @media (min-width: 577px) and (max-width: 991.98px) {
      .rp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    /* Phones (≤ 576px): 1 card per row, full-width button, compact cards */
    @media (max-width: 576px) {
      .rp-grid { grid-template-columns: minmax(0, 1fr); }
      .dashboard-page .rep-header-btn { width: 100%; justify-content: center; }
      .dashboard-page .rp-filters { margin-left: -0.75rem; margin-right: -0.75rem; padding-left: 0.75rem; padding-right: 0.75rem; scrollbar-width: none; }
      .dashboard-page .rp-filters::-webkit-scrollbar { display: none; }
      .rp-type-ic { width: 46px !important; height: 46px !important; }
      .rp-info { padding: 0.7rem 0.8rem !important; }
      .rp-foot { gap: 0.5rem; }
    }
    /* Small phones (≤ 400px) */
    @media (max-width: 400px) {
      .rp-title { font-size: 1.3rem !important; }
      .rp-card { padding: 0.85rem !important; }
      .rp-foot { flex-wrap: wrap; }
      .rp-foot .rp-btn { flex: 1 1 auto; justify-content: center; }
      .rp-desc { font-size: 0.85rem; }
    }

    /* Page: normal size on phones */
    @media (max-width: 768px) { .dashboard-page { zoom: 1; padding-left: 0.75rem !important; padding-right: 0.75rem !important; } }

    /* Modals: same zoom as the page; normal size and centered on phones */
    .rp-zoom-modal { zoom: 0.75; }
    @media (min-width: 1600px) { .rp-zoom-modal { zoom: 0.9; } }
    @media (min-width: 1920px) { .rp-zoom-modal { zoom: 1; } }
    @media (max-width: 768px) {
      .rp-zoom-modal { zoom: 1; }
      .rp-zoom-modal .modal-dialog { margin: 0.75rem auto; max-width: calc(100% - 1.5rem); display: flex; align-items: center; min-height: calc(100% - 1.5rem); }
      .rp-zoom-modal .modal-dialog-scrollable { height: calc(100% - 1.5rem); }
    }

    /* Big modals (submit / view) */
    .rm-modal { max-width: 680px; }
    .rm-modal.lg { max-width: 940px; }
    .rm-modal .modal-content, .cm-modal .modal-content { border: none; border-radius: 16px; overflow: hidden; box-shadow: 0 24px 60px rgba(16,24,40,0.2); }
    .rm-head { align-items: flex-start !important; padding: 1.25rem 1.5rem !important; border-bottom: 1px solid #eef0f3 !important; background: linear-gradient(180deg, color-mix(in srgb, var(--c, #ffc107) 8%, #fff) 0%, #fff 100%); }
    .rm-head-main { display: flex; gap: 0.9rem; align-items: center; min-width: 0; flex: 1; }
    .rm-head-ic { width: 48px; height: 48px; border-radius: 13px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; color: #b88a00; background: rgba(255,193,7,0.18); }
    .rm-head-ic img { width: 30px; height: 30px; object-fit: contain; }
    .rm-kicker { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #b88a00; }
    .rm-title { font-size: 1.2rem; font-weight: 700; color: #1f2328; margin: 0; line-height: 1.3; word-break: break-word; }
    .rm-head-sub { font-size: 0.8rem; color: #6b7280; margin-top: 0.15rem; }
    .rm-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.3rem; }
    .rm-num { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.78rem; font-weight: 600; color: #6b7280; margin-top: 0.15rem; }
    .rm-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .rm-req { color: #dc3545; }
    .rm-body { padding: 1.4rem 1.5rem !important; }
    .rm-section { margin-bottom: 1.4rem; }
    .rm-section-title { display: flex; align-items: center; gap: 0.45rem; font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 0.75rem; }
    .rm-section-title > i { color: #e0a800; font-size: 0.8rem; }
    .rm-count { margin-left: auto; font-size: 0.7rem; background: #f3f4f6; color: #4b5563; padding: 0.1rem 0.55rem; border-radius: 999px; letter-spacing: 0; }
    .rm-label { font-size: 0.84rem; font-weight: 600; color: #374151; margin-bottom: 0.35rem; }
    .rm-input { border-radius: 10px !important; border: 1.5px solid #e5e7eb !important; padding: 0.62rem 0.8rem !important; font-size: 0.92rem; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
    .rm-input:focus { border-color: #ffc107 !important; box-shadow: 0 0 0 3px rgba(255,193,7,0.18) !important; }
    .rm-input.good { border-color: #10b981 !important; }
    .rm-input.bad { border-color: #ef4444 !important; }
    .rm-hint { font-size: 0.78rem; color: #6b7280; margin-top: 0.4rem; display: flex; align-items: center; gap: 0.35rem; }
    .rm-hint.bad { color: #dc3545; }
    .rm-readonly { display: flex; align-items: center; gap: 0.55rem; min-height: 44px; padding: 0.6rem 0.8rem; border-radius: 10px; border: 1.5px dashed #e5e7eb; background: #f8f9fa; font-size: 0.92rem; font-weight: 600; color: #1f2328; }
    .rm-readonly i { color: #9ca3af; }
    .rm-readonly.empty { font-weight: 500; font-style: italic; color: #9ca3af; }
    .rm-types { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.6rem; }
    .rm-type { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 0.9rem 0.5rem; border: 1.5px solid #e5e7eb; border-radius: 14px; background: #fff; transition: all 0.15s ease; }
    .rm-type:hover:not(:disabled) { border-color: color-mix(in srgb, var(--c) 50%, #fff); }
    .rm-type.on { border-color: var(--c); background: color-mix(in srgb, var(--c) 6%, #fff); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 15%, transparent); }
    .rm-type-ic { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
    .rm-type-ic img { width: 30px; height: 30px; object-fit: contain; }
    .rm-type-label { font-weight: 700; font-size: 0.86rem; color: #374151; text-align: center; line-height: 1.2; }
    .rm-type.on .rm-type-label { color: var(--c); }
    .rm-type-check { position: absolute; top: 7px; right: 8px; color: var(--c); font-size: 0.85rem; }
    .rm-map { border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; }
    .rm-pin { display: flex; align-items: center; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.55rem; padding: 0.55rem 0.75rem; border-radius: 10px; background: #f8f9fa; color: #6b7280; font-size: 0.8rem; }
    .rm-pin.ok { background: rgba(25,135,84,0.07); color: #146c43; border: 1px solid rgba(25,135,84,0.2); }
    .rm-pin .rm-mono { margin-left: 0.3rem; opacity: 0.85; }
    .rm-pin button { margin-left: auto; border: none; background: none; color: #dc3545; font-size: 0.78rem; font-weight: 600; padding: 0; display: inline-flex; align-items: center; gap: 0.3rem; }
    .rm-photos { display: flex; flex-wrap: wrap; gap: 0.6rem; }
    .rm-thumb { position: relative; width: 96px; height: 96px; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; background: #f8f9fa; padding: 0; flex-shrink: 0; }
    .rm-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .rm-thumb > button { position: absolute; top: 5px; right: 5px; width: 24px; height: 24px; border-radius: 50%; border: none; background: rgba(17,24,39,0.7); color: #fff; font-size: 0.7rem; display: flex; align-items: center; justify-content: center; }
    .rm-thumb.view { cursor: zoom-in; transition: transform 0.15s ease, box-shadow 0.15s ease; }
    .rm-thumb.view:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.12); }
    .rm-thumb-zoom { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0); color: transparent; transition: all 0.15s ease; }
    .rm-thumb.view:hover .rm-thumb-zoom { background: rgba(0,0,0,0.3); color: #fff; }
    .rm-thumb.broken::after { content: 'No preview'; position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: #9ca3af; }
    .rm-thumb.sm { width: 64px; height: 64px; border-radius: 10px; }
    .rm-drop { width: 96px; height: 96px; border-radius: 12px; border: 1.5px dashed #d1d5db; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.3rem; color: #6b7280; font-size: 0.78rem; font-weight: 600; cursor: pointer; margin: 0; transition: all 0.15s ease; }
    .rm-drop i { font-size: 1rem; color: #e0a800; }
    .rm-drop:hover { border-color: #ffc107; background: #fffaeb; color: #1f2328; }
    .rm-drop.disabled { opacity: 0.5; pointer-events: none; }
    .rm-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.55rem; }
    .rm-info { display: flex; gap: 0.65rem; align-items: flex-start; padding: 0.7rem 0.8rem; border: 1px solid #eef0f3; border-radius: 12px; background: #fafbfc; }
    .rm-info.wide { grid-column: 1 / -1; }
    .rm-info-ic { width: 30px; height: 30px; border-radius: 9px; background: #fff; border: 1px solid #eef0f3; color: #9ca3af; display: flex; align-items: center; justify-content: center; font-size: 0.78rem; flex-shrink: 0; }
    .rm-info-label { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #9ca3af; }
    .rm-info-value { font-size: 0.9rem; font-weight: 600; color: #1f2328; word-break: break-word; }
    .rm-desc { font-size: 0.92rem; color: #374151; line-height: 1.6; margin: 0; white-space: pre-line; word-break: break-word; }
    .rm-desc.sm { font-size: 0.86rem; padding: 0.65rem 0.8rem; border: 1px solid #eef0f3; border-radius: 10px; background: #fafbfc; }
    .rm-desc.muted { color: #9ca3af; font-style: italic; }
    .rm-admin { margin-top: 1rem; padding: 0.85rem 1rem; border-radius: 12px; background: rgba(13,110,253,0.05); border: 1px solid rgba(13,110,253,0.18); }
    .rm-admin-head { font-size: 0.78rem; font-weight: 700; color: #0a58ca; display: flex; align-items: center; gap: 0.45rem; margin-bottom: 0.3rem; }
    .rm-admin p { margin: 0; font-size: 0.88rem; color: #374151; white-space: pre-line; }
    .rm-map.view { min-height: 260px; }
    .rm-empty { padding: 1.25rem; border: 1px dashed #e5e7eb; border-radius: 12px; color: #9ca3af; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem; }
    .rm-alert { display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.75rem 0.9rem; border-radius: 10px; font-size: 0.86rem; margin-bottom: 1rem; }
    .rm-alert i { margin-top: 3px; }
    .rm-alert.danger { background: rgba(220,53,69,0.07); border: 1px solid rgba(220,53,69,0.25); color: #b02a37; }
    .rm-foot { padding: 0.9rem 1.5rem !important; border-top: 1px solid #eef0f3 !important; display: flex; justify-content: flex-end; align-items: center; gap: 0.6rem; }
    .rm-lightbox { position: fixed; inset: 0; z-index: 100000; background: rgba(0,0,0,0.92); display: flex; align-items: center; justify-content: center; padding: 1rem; }
    .rm-lightbox img { max-width: 92vw; max-height: 86vh; object-fit: contain; border-radius: 12px; box-shadow: 0 8px 40px rgba(0,0,0,0.6); transition: transform 0.1s ease; }
    .rm-lb-btn { position: absolute; width: 44px; height: 44px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.15); color: #fff; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); }
    .rm-lb-btn.close { top: 1.25rem; right: 1.25rem; }
    .rm-lb-btn.prev { left: 1rem; top: 50%; transform: translateY(-50%); }
    .rm-lb-btn.next { right: 1rem; top: 50%; transform: translateY(-50%); }
    .rm-lb-count { position: absolute; bottom: 1.25rem; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.75); font-size: 0.8rem; font-weight: 600; }

    /* Small confirmation modals (withdraw / verify / review) */
    .cm-modal { max-width: 430px; }
    .cm-modal.wide { max-width: 520px; }
    @keyframes cmPop { 0% { transform: scale(0.7); opacity: 0; } 70% { transform: scale(1.06); opacity: 1; } 100% { transform: scale(1); } }
    .cm-body { padding: 1.75rem 1.6rem 1.25rem !important; text-align: center; position: relative; }
    .cm-x { position: absolute; top: 1rem; right: 1rem; }
    .cm-icon { width: 58px; height: 58px; border-radius: 16px; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; font-size: 1.45rem; color: var(--c); background: color-mix(in srgb, var(--c) 13%, #fff); animation: cmPop 0.4s ease-out; }
    .cm-title { font-weight: 700; color: #1f2328; margin-bottom: 0.35rem; font-size: 1.15rem; }
    .cm-text { font-size: 0.88rem; color: #6b7280; margin-bottom: 1.1rem; line-height: 1.55; }
    .cm-item { display: flex; align-items: center; gap: 0.7rem; text-align: left; padding: 0.7rem 0.85rem; border: 1px solid #eef0f3; border-radius: 12px; background: #fafbfc; }
    .cm-item-av { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .cm-item-av img { width: 26px; height: 26px; object-fit: contain; }
    .cm-item-name { font-weight: 700; color: #1f2328; font-size: 0.94rem; }
    .cm-item-meta { font-size: 0.76rem; color: #6b7280; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cm-note { display: flex; gap: 0.5rem; align-items: flex-start; text-align: left; margin-top: 0.8rem; padding: 0.65rem 0.8rem; border-radius: 10px; font-size: 0.8rem; line-height: 1.5; color: color-mix(in srgb, var(--c) 80%, #000); background: color-mix(in srgb, var(--c) 7%, #fff); border: 1px solid color-mix(in srgb, var(--c) 22%, #fff); }
    .cm-note i { margin-top: 3px; }
    .cm-steps { text-align: left; display: flex; flex-direction: column; gap: 0.45rem; }
    .cm-step { display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem 0.75rem; border: 1px solid #eef0f3; border-radius: 10px; background: #fafbfc; font-size: 0.86rem; color: #374151; font-weight: 500; }
    .cm-step span { width: 22px; height: 22px; border-radius: 50%; background: #ffc107; color: #1f2328; font-size: 0.72rem; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .cm-step i { color: #b88a00; width: 16px; text-align: center; }
    .cm-foot { border-top: 1px solid #eef0f3 !important; padding: 0.9rem 1.4rem !important; gap: 0.6rem; flex-wrap: nowrap !important; }
    .cm-foot .rp-btn { flex: 1; margin: 0; padding: 0.62rem; }
    .cm-confirm { background: var(--c); color: #fff; }
    .cm-confirm:hover:not(:disabled) { background: color-mix(in srgb, var(--c) 85%, #000); color: #fff; }

    @media (max-width: 991.98px) {
      .rm-types { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 768px) {
      .rm-head { padding: 1rem !important; }
      .rm-head-ic { width: 42px; height: 42px; }
      .rm-title { font-size: 1.08rem; }
      .rm-body { padding: 1rem !important; }
      .rm-type { flex-direction: row; justify-content: flex-start; padding: 0.65rem 0.7rem; gap: 0.55rem; }
      .rm-type-ic { width: 36px; height: 36px; border-radius: 10px; }
      .rm-type-ic img { width: 22px; height: 22px; }
      .rm-type-label { text-align: left; font-size: 0.82rem; }
      .rm-thumb, .rm-drop { width: 84px; height: 84px; }
      .rm-info { padding: 0.6rem 0.65rem; gap: 0.5rem; }
      .rm-info-ic { display: none; }
      .rm-info-value { font-size: 0.86rem; }
      .rm-foot { padding: 0.75rem 1rem !important; }
      .rm-foot .rp-btn { flex: 1; }
      .rm-foot .me-auto { margin-right: 0 !important; }
      .cm-body { padding: 1.5rem 1.1rem 1rem !important; }
      .cm-foot { padding: 0.8rem 1rem !important; }
    }
    @media (max-width: 380px) {
      .rm-info-grid { grid-template-columns: 1fr; }
    }
    @media (prefers-reduced-motion: reduce) { .cm-icon { animation: none; } }

    /* Clinic extras */
    .rp-backdrop-top { z-index: 1060 !important; }
    .rm-head-ic.danger { background: rgba(220,53,69,0.1); color: #dc3545; }
    .rm-kicker.danger { color: #dc3545; }
    .rm-opt { font-size: 0.7rem; font-weight: 600; text-transform: none; letter-spacing: 0; color: #9ca3af; }
    .rm-alert.warn { background: rgba(255,193,7,0.1); border: 1px solid rgba(255,193,7,0.35); color: #8a6700; }
    .rm-map > div > div:last-of-type { border: none !important; border-radius: 0 !important; }
    .rm-map small { padding: 0 0.75rem 0.5rem; }
    .cm-item-av { font-size: 1rem; }
    .cm-foot .rp-btn.primary:only-child { flex: 1; }
    @media (max-width: 576px) { .dashboard-page .rep-header-btn { width: 100%; } }
  `;

  useEffect(() => { loadData(); }, []);

  const hasLoadedRef = useRef(false);

  // First load shows the skeleton; reloads after an action are silent (no jump to the top)
  const loadData = async () => {
    try {
      if (!hasLoadedRef.current) setLoading(true);
      const [rRes, bRes] = await Promise.all([
        clinicReportsAPI.getMyReports(),
        barangayAPI.getAll(),
      ]);
      // Filter only rabies_case reports submitted by this clinic
      const all = rRes.data.reports || [];
      setReports(all.filter(r => r.report_type === 'rabies_case'));
      setBarangays(bRes.data.barangays || []);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  };

  const getBarangayName = (id) => {
    const b = barangays.find(b => b.id === parseInt(id));
    return b ? b.name : 'Unknown';
  };

  const formatDate = (d) => {
    if (!d) return 'N/A';
    return new Date(d).toLocaleDateString('en-PH', { year:'numeric', month:'long', day:'numeric' });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (submitError) setSubmitError('');
  };

  const handleOpenModal = () => {
    setFormData({ barangay_id:'', address:'', phone_number:'', description:'' });
    setSubmitError('');
    setImageFiles([]);
    setImagePreviews([]);
    setFormLat(null);
    setFormLng(null);
    setShowModal(true);
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const MAX = 3;
    if (files.length + imageFiles.length > MAX) { setSubmitError(`Max ${MAX} images allowed.`); return; }
    const newFiles = [...imageFiles, ...files].slice(0, MAX);
    setImageFiles(newFiles);
    setImagePreviews(newFiles.map(f => URL.createObjectURL(f)));
  };

  const handleDeleteReport = (report) => {
    setReportToDelete(report);
    setShowDeleteModal(true);
    setShowDropdown(null);
  };

  const confirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await clinicReportsAPI.delete(reportToDelete.id);
      setSuccessMsg('Report withdrawn successfully.');
      setShowDeleteModal(false);
      setReportToDelete(null);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleEditReport = (report) => {
    setReportToEdit(report);
    setEditData({
      address:      report.address      || '',
      phone_number: report.phone_number || '',
      description:  report.description  || '',
    });
    setEditError('');
    setShowEditModal(true);
    setShowDropdown(null);
  };

  const confirmEdit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    setEditError('');
    if (!editData.address.trim())      { setEditError('Address is required.');        setEditLoading(false); return; }
    if (!editData.phone_number.trim()) { setEditError('Contact number is required.'); setEditLoading(false); return; }
if (!/^09\d{9}$/.test(editData.phone_number)) { setEditError('Contact number must be 11 digits starting with 09.'); setEditLoading(false); return; }
    try {
      await api.put(`/reports/update/${reportToEdit.id}`, {
        address:      editData.address,
        phone_number: editData.phone_number,
        description:  editData.description,
      });
      setSuccessMsg('Report updated successfully.');
      setShowEditModal(false);
      setReportToEdit(null);
      await loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setEditError(message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleRemoveImage = (i) => {
    const newFiles = imageFiles.filter((_, idx) => idx !== i);
    setImageFiles(newFiles);
    setImagePreviews(newFiles.map(f => URL.createObjectURL(f)));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitError('');

    if (!formData.barangay_id)         { setSubmitError('Please choose the barangay where the case happened.'); setSubmitLoading(false); return; }
    if (!formData.address.trim())      { setSubmitError('Address is required.');        setSubmitLoading(false); return; }
if (!formData.phone_number.trim()) { setSubmitError('Contact number is required.'); setSubmitLoading(false); return; }
if (!/^09\d{9}$/.test(formData.phone_number)) { setSubmitError('Contact number must be 11 digits starting with 09.'); setSubmitLoading(false); return; }
    if (!formLat || !formLng)          { setSubmitError('Please pin a location on the map.'); setSubmitLoading(false); return; }

    try {
      const fd = new FormData();
      fd.append('report_type',  'rabies_case');
      fd.append('barangay_id',  formData.barangay_id);
      fd.append('address',      formData.address);
      fd.append('phone_number', formData.phone_number);
      fd.append('description',  formData.description);
      fd.append('latitude',     formLat);
      fd.append('longitude',    formLng);
      // Signal backend to auto-set positive_rabies
      
      imageFiles.forEach(f => fd.append('images[]', f));

      await clinicReportsAPI.create(fd);
      setShowModal(false);
      setSuccessMsg('Rabies case submitted. The City Vet will verify it shortly.');
      await loadData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      const { message } = handleAPIError(err);
      setSubmitError(message);
    } finally {
      setSubmitLoading(false);
    }
  };



  const STATUS_META = {
    pending:          { label: 'Pending',          color: '#b88a00', icon: 'fa-clock' },
    suspected_rabies: { label: 'Suspected Rabies', color: '#dc3545', icon: 'fa-exclamation-triangle' },
    positive_rabies:  { label: 'Positive Rabies',  color: '#8b0000', icon: 'fa-biohazard' },
    ongoing:          { label: 'Ongoing',          color: '#0a8aa3', icon: 'fa-spinner' },
    resolved:         { label: 'Resolved',         color: '#198754', icon: 'fa-check-circle' },
    declined:         { label: 'Declined',         color: '#6b7280', icon: 'fa-ban' },
  };
  const statusMeta = (s) => STATUS_META[s] || { label: s || 'Unknown', color: '#6b7280', icon: 'fa-question-circle' };

  const formatShort = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(String(dateStr).replace(' ', 'T'));
    return isNaN(d) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Status filter (only statuses the user actually has)
  const statusCounts = reports.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
  const filterOptions = [
    { key: 'all', label: 'All', count: reports.length },
    ...Object.keys(STATUS_META).filter(k => statusCounts[k]).map(k => ({ key: k, label: STATUS_META[k].label, count: statusCounts[k] })),
  ];
  const visibleReports = statusFilter === 'all' ? reports : reports.filter(r => r.status === statusFilter);
  const pagedReports = visibleReports.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const pageCount = Math.ceil(visibleReports.length / itemsPerPage);


  const renderPager = () => {
    if (pageCount <= 1) return null;
    let start = Math.max(1, currentPage - 1);
    const end = Math.min(pageCount, start + 2);
    if (end - start < 2) start = Math.max(1, end - 2);
    const pages = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return (
      <div className="rp-pager report-pagination">
        <span className="rp-pager-text page-info">
          Showing <strong>{(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, visibleReports.length)}</strong> of {visibleReports.length}
        </span>
        <div className="d-flex align-items-center gap-1">
          <button type="button" className="rp-page nav" onClick={() => setCurrentPage(Math.max(currentPage - 1, 1))} disabled={currentPage === 1} aria-label="Previous page">
            <i className="fas fa-chevron-left" />
          </button>
          {pages.map(n => (
            <button key={n} type="button" className={`rp-page${n === currentPage ? ' on' : ''}`} onClick={() => setCurrentPage(n)} aria-current={n === currentPage ? 'page' : undefined}>{n}</button>
          ))}
          <button type="button" className="rp-page nav" onClick={() => setCurrentPage(Math.min(currentPage + 1, pageCount))} disabled={currentPage === pageCount} aria-label="Next page">
            <i className="fas fa-chevron-right" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{styles}</style>
      <Container fluid className="py-4 dashboard-page" style={{ backgroundColor: '#ffffff', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4 rp-anim">
          <div>
            <div className="d-flex align-items-center flex-wrap gap-2">
              <h2 className="rp-title rep-title">Rabies Case Reports</h2>
            </div>
            <p className="rp-sub rep-subtitle">Report confirmed or suspected rabies cases to alert the City Vet and the community.</p>
          </div>
          {reports.length > 0 && (
            <button type="button" className="rp-btn primary lg rep-header-btn" onClick={handleOpenModal}>
              <i className="fas fa-plus" />Report rabies case
            </button>
          )}
        </div>

        {error && (
          <div className="rm-alert danger" role="alert">
            <i className="fas fa-exclamation-circle" /><span className="flex-grow-1">{error}</span>
            <button type="button" className="rp-toast-close" onClick={() => setError('')} aria-label="Dismiss"><i className="fas fa-times" /></button>
          </div>
        )}

        {successMsg && (
          <div className="rp-toast" role="status">
            <div className="ic"><i className="fas fa-check" /></div>
            <div className="flex-grow-1">
              <div className="t">Success</div>
              <div className="d">{successMsg}</div>
            </div>
            <button type="button" className="rp-toast-close" onClick={() => setSuccessMsg('')} aria-label="Close">
              <i className="fas fa-times" />
            </button>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="rp-grid">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="rp-card" style={{ opacity: 1 - i * 0.2, minHeight: 230 }}>
                <div className="d-flex gap-3 align-items-center mb-3">
                  <div className="rp-skel" style={{ width: 56, height: 56, borderRadius: 14 }} />
                  <div className="flex-grow-1">
                    <div className="rp-skel mb-2" style={{ width: '55%', height: 14 }} />
                    <div className="rp-skel" style={{ width: '35%', height: 10 }} />
                  </div>
                </div>
                <div className="rp-skel mb-2" style={{ height: 64 }} />
                <div className="rp-skel" style={{ width: '45%', height: 10 }} />
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="rp-empty rp-anim" style={{ '--d': '0.1s' }}>
            <div className="ic"><i className="fas fa-biohazard" /></div>
            <h5>No rabies cases reported yet</h5>
            <p>Report confirmed or suspected rabies cases to alert the community and start an immediate response.</p>
            <button type="button" className="rp-btn primary lg" onClick={handleOpenModal}>
              <i className="fas fa-plus" />Report first rabies case
            </button>
          </div>
        ) : (
          <>
            {/* Status filter */}
            {filterOptions.length > 2 && (
              <div className="rp-filters mb-3 rp-anim" style={{ '--d': '0.05s' }}>
                {filterOptions.map(f => (
                  <button
                    key={f.key}
                    type="button"
                    className={`rp-filter${statusFilter === f.key ? ' on' : ''}`}
                    style={f.key !== 'all' ? { '--c': STATUS_META[f.key].color } : undefined}
                    onClick={() => { setStatusFilter(f.key); setCurrentPage(1); setShowDropdown(null); }}
                    aria-pressed={statusFilter === f.key}
                  >
                    {f.key !== 'all' && <i className="dot" />}
                    {f.label}
                    <span className="count">{f.count}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="rp-grid" style={{ flex: '1 1 auto', alignContent: 'flex-start' }}>
              {pagedReports.map((report, index) => {
                const typeInfo = { label: 'Rabies case', color: '#dc3545' };
                const st = statusMeta(report.status);
                const canWithdraw = report.status === 'pending' || report.status === 'positive_rabies';
                const menuOpen = showDropdown === report.id;
                const openDetails = () => { setSelectedReport(report); setShowViewModal(true); setShowDropdown(null); };
                return (
                  <div key={report.id} className={`rp-card rp-anim${menuOpen ? ' raised' : ''}`} style={{ '--d': `${0.08 + index * 0.06}s`, '--t': typeInfo.color }}>
                    {/* Top */}
                    <div className="rp-top">
                      <div className="rp-type-ic" style={{ background: 'rgba(220,53,69,0.1)', color: '#dc3545', fontSize: '1.3rem' }}>
                        <i className="fas fa-biohazard" />
                      </div>
                      <div className="flex-grow-1" style={{ minWidth: 0 }}>
                        <div className="rp-type">{typeInfo.label}</div>
                        <div className="rp-num">
                          <i className="fas fa-hashtag" />{report.report_number || `RPT-${String(report.id).padStart(6, '0')}`}
                        </div>
                      </div>

                      {/* Menu */}
                      <div style={{ position: 'relative', alignSelf: 'flex-start' }}>
                        <button
                          type="button"
                          className={`rp-icon-btn${menuOpen ? ' on' : ''}`}
                          onClick={() => setShowDropdown(menuOpen ? null : report.id)}
                          aria-label="More options"
                          aria-expanded={menuOpen}
                        >
                          <i className="fas fa-ellipsis-v" />
                        </button>
                        {menuOpen && (
                          <>
                            <div onClick={() => setShowDropdown(null)} style={{ position: 'fixed', inset: 0, zIndex: 999 }} />
                            <div className="rp-menu" role="menu">
                              <button type="button" role="menuitem" className="rp-menu-item" onClick={openDetails}>
                                <i className="fas fa-eye" />View details
                              </button>
                              {canWithdraw ? (
                                <>
                                  <button type="button" role="menuitem" className="rp-menu-item" onClick={() => { setShowDropdown(null); handleEditReport(report); }}>
                                    <i className="fas fa-pen" />Edit report
                                  </button>
                                  <div className="rp-menu-sep" />
                                  <button type="button" role="menuitem" className="rp-menu-item danger" onClick={() => { setShowDropdown(null); handleDeleteReport(report); }}>
                                    <i className="fas fa-undo-alt" />Withdraw report
                                  </button>
                                </>
                              ) : (
                                <div className="rp-menu-note">
                                  <i className="fas fa-lock" />
                                  This report is already {st.label.toLowerCase()}, so it can't be withdrawn.
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="mb-3">
                      <span className="rp-chip" style={{ color: st.color, background: `color-mix(in srgb, ${st.color} 12%, #fff)` }}>
                        <i className={`fas ${st.icon}`} />{st.label}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="rp-info">
                      <div className="row-i">
                        <i className="fas fa-map-marker-alt" />
                        <div style={{ minWidth: 0 }}>
                          <div className="v">{getBarangayName(report.barangay_id)}</div>
                          <div className="s rp-ellipsis" title={report.address}>{report.address || 'No address given'}</div>
                        </div>
                      </div>
                      <div className="row-i">
                        <i className="fas fa-phone-alt" />
                        <div className="v">{report.phone_number || 'N/A'}</div>
                      </div>
                    </div>

                    {report.description && (
                      <p className="rp-desc">{report.description}</p>
                    )}

                    {/* Footer */}
                    <div className="rp-foot">
                      <span className="rp-muted"><i className="far fa-calendar me-1" />Submitted {formatShort(report.created_at)}</span>
                      <button type="button" className="rp-btn ghost sm" onClick={openDetails}>
                        View details<i className="fas fa-arrow-right" style={{ fontSize: '0.7rem' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {renderPager()}
          </>
        )}

        {/* ======================== SUBMIT MODAL ======================== */}
        <Modal show={showModal} onHide={() => !submitLoading && setShowModal(false)} backdrop="static" dialogClassName="rm-modal" className="rp-zoom-modal" scrollable>
          <Modal.Header closeButton className="rm-head" style={{ '--c': '#dc3545' }}>
            <div className="rm-head-main">
              <div className="rm-head-ic danger"><i className="fas fa-biohazard" /></div>
              <div style={{ minWidth: 0 }}>
                <div className="rm-kicker danger">Clinic report</div>
                <Modal.Title as="h5" className="rm-title">Report a rabies case</Modal.Title>
                <div className="rm-head-sub">The City Vet verifies it before it alerts the community.</div>
              </div>
            </div>
          </Modal.Header>
          <Modal.Body className="rm-body">
            {submitError && <div className="rm-alert danger"><i className="fas fa-exclamation-circle" /><span>{submitError}</span></div>}

            {/* Location */}
            <div className="rm-section">
              <div className="rm-section-title"><i className="fas fa-map-marker-alt" />Case location</div>
              <Form.Group className="mb-3">
                <Form.Label className="rm-label">Pin the exact location <span className="rm-req">*</span></Form.Label>
                <div className="rm-map">
                  <GoogleMapPicker
                    lat={formLat} lng={formLng}
                    onLocationSelect={(lt, ln) => { setFormLat(lt); setFormLng(ln); }}
                    onAddressResolve={(addr) => setFormData(prev => ({ ...prev, address: addr }))}
                    onBarangayDetect={(areaStr, pLat, pLng) => {
                      const match = findBarangay(barangays, areaStr, pLat, pLng);
                      if (match) setFormData(prev => ({ ...prev, barangay_id: String(match.id) }));
                    }}
                    onError={msg => setLocationError(msg)}
                  />
                </div>
                {formLat && formLng ? (
                  <div className="rm-pin ok">
                    <i className="fas fa-check-circle" />
                    <span>Location pinned <span className="rm-mono">{formLat.toFixed(5)}, {formLng.toFixed(5)}</span></span>
                    <button type="button" onClick={() => { setFormLat(null); setFormLng(null); setFormData(prev => ({ ...prev, barangay_id: '' })); }} disabled={submitLoading}>
                      <i className="fas fa-times" />Clear
                    </button>
                  </div>
                ) : (
                  <div className="rm-pin"><i className="fas fa-hand-pointer" />Tap the map to drop a pin. The barangay and address fill in automatically.</div>
                )}
              </Form.Group>
              <Row className="g-3">
                <Col md={6}>
                  <Form.Label className="rm-label">Barangay <span className="rm-req">*</span></Form.Label>
                  <Form.Select
                    className="rm-input"
                    name="barangay_id"
                    value={formData.barangay_id}
                    onChange={handleFormChange}
                    disabled={submitLoading}
                  >
                    <option value="">Pin the map or choose…</option>
                    {[...barangays].sort((a, b) => a.name.localeCompare(b.name)).map(b => (
                      <option key={b.id} value={String(b.id)}>{b.name}</option>
                    ))}
                  </Form.Select>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.3rem' }}>
                    <i className="fas fa-magic me-1" />Filled in from your pin. Change it if it's wrong.
                  </div>
                </Col>
                <Col md={6}>
                  <Form.Label className="rm-label">Contact number <span className="rm-req">*</span></Form.Label>
                  <Form.Control
                    className={`rm-input${formData.phone_number && !/^09\d{9}$/.test(formData.phone_number) ? ' bad' : formData.phone_number ? ' good' : ''}`}
                    type="tel" inputMode="numeric" maxLength={11} name="phone_number" value={formData.phone_number}
                    onChange={handleFormChange}
                    onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) e.preventDefault(); }}
                    placeholder="09XXXXXXXXX" required disabled={submitLoading}
                  />
                  {formData.phone_number && !/^09\d{9}$/.test(formData.phone_number) && (
                    <div className="rm-hint bad"><i className="fas fa-times-circle" />Must be 11 digits starting with 09</div>
                  )}
                </Col>
                <Col md={12}>
                  <Form.Label className="rm-label">Address <span className="rm-req">*</span></Form.Label>
                  <Form.Control className="rm-input" type="text" name="address" value={formData.address}
                    onChange={handleFormChange} placeholder="House no., street, purok / sitio…" required disabled={submitLoading} />
                </Col>
              </Row>
            </div>

            {/* Details */}
            <div className="rm-section">
              <div className="rm-section-title"><i className="fas fa-align-left" />Case details</div>
              <Form.Control className="rm-input" as="textarea" rows={3} name="description" value={formData.description}
                onChange={handleFormChange} placeholder="Describe the animal, symptoms observed, date of exposure, patient info (if any)…" disabled={submitLoading} />
            </div>

            {/* Photos */}
            <div className="rm-section mb-0">
              <div className="rm-section-title"><i className="fas fa-camera" />Photos <span className="rm-opt">optional</span><span className="rm-count">{imageFiles.length}/3</span></div>
              <div className="rm-photos">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="rm-thumb">
                    <img src={src} alt={`Attachment ${i + 1}`} />
                    <button type="button" onClick={() => handleRemoveImage(i)} disabled={submitLoading} aria-label="Remove photo"><i className="fas fa-times" /></button>
                  </div>
                ))}
                {imageFiles.length < 3 && (
                  <label className={`rm-drop${submitLoading ? ' disabled' : ''}`}>
                    <input type="file" accept="image/*" multiple onChange={handleImageChange} disabled={submitLoading} hidden />
                    <i className="fas fa-plus" />
                    <span>Add photo</span>
                  </label>
                )}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer className="rm-foot">
            <button type="button" className="rp-btn ghost lg" onClick={() => setShowModal(false)} disabled={submitLoading}>Cancel</button>
            <button type="button" className="rp-btn primary lg" disabled={submitLoading}
              onClick={() => {
                if (!formLat || !formLng)          { setSubmitError('Please pin a location on the map.'); return; }
                if (!formData.barangay_id)         { setSubmitError('Please choose the barangay where the case happened.'); return; }
                if (!formData.phone_number.trim()) { setSubmitError('Contact number is required.'); return; }
                if (!/^09\d{9}$/.test(formData.phone_number)) { setSubmitError('Contact number must be 11 digits starting with 09.'); return; }
                if (!formData.address.trim())      { setSubmitError('Address is required.'); return; }
                setSubmitError('');
                setShowConfirmModal(true);
              }}>
              {submitLoading ? <><i className="fas fa-circle-notch fa-spin" />Submitting…</> : <><i className="fas fa-arrow-right" />Review report</>}
            </button>
          </Modal.Footer>
        </Modal>

        {/* ======================== LOCATION ERROR MODAL ======================== */}
        <Modal show={!!locationError} onHide={() => setLocationError('')} centered dialogClassName="cm-modal" className="rp-zoom-modal" style={{ zIndex: 1065 }} backdropClassName="rp-backdrop-top">
          <Modal.Body className="cm-body">
            <div className="cm-icon" style={{ '--c': '#e0a800' }}><i className="fas fa-map-marker-alt" /></div>
            <h5 className="cm-title">Can't pin this location</h5>
            <p className="cm-text mb-0">{locationError}</p>
            <div className="cm-note" style={{ '--c': '#b88a00' }}>
              <i className="fas fa-info-circle" /><span>Only locations inside Muntinlupa City can be reported.</span>
            </div>
          </Modal.Body>
          <Modal.Footer className="cm-foot">
            <button type="button" className="rp-btn primary" onClick={() => setLocationError('')}>Got it</button>
          </Modal.Footer>
        </Modal>

        {/* ======================== VIEW DETAILS MODAL ======================== */}
        <Modal show={showViewModal} onHide={() => setShowViewModal(false)} dialogClassName="rm-modal lg" className="rp-zoom-modal" scrollable>
          {selectedReport && (() => {
            const r = selectedReport;
            const st = statusMeta(r.status);
            const canWithdraw = r.status === 'pending' || r.status === 'positive_rabies';
            const info = [
              { icon: 'fa-map', label: 'Barangay', value: getBarangayName(r.barangay_id) },
              { icon: 'fa-phone-alt', label: 'Contact no.', value: r.phone_number || 'N/A' },
              { icon: 'fa-home', label: 'Address', value: r.address || 'N/A', wide: true },
              { icon: 'fa-calendar-plus', label: 'Submitted', value: formatDate(r.created_at) },
              r.updated_at && r.updated_at !== r.created_at && { icon: 'fa-history', label: 'Last updated', value: formatDate(r.updated_at) },
            ].filter(Boolean);
            return (
              <>
                <Modal.Header closeButton className="rm-head" style={{ '--c': '#dc3545' }}>
                  <div className="rm-head-main">
                    <div className="rm-head-ic danger"><i className="fas fa-biohazard" /></div>
                    <div style={{ minWidth: 0 }}>
                      <div className="rm-chips">
                        <span className="rp-chip" style={{ color: st.color, background: `color-mix(in srgb, ${st.color} 12%, #fff)` }}>
                          <i className={`fas ${st.icon}`} />{st.label}
                        </span>
                      </div>
                      <Modal.Title as="h5" className="rm-title">Rabies case</Modal.Title>
                      <div className="rm-num">#{r.report_number || `RPT-${String(r.id).padStart(6, '0')}`}</div>
                    </div>
                  </div>
                </Modal.Header>
                <Modal.Body className="rm-body">
                  <Row className="g-4">
                    <Col lg={7}>
                      <div className="rm-section-title"><i className="fas fa-info-circle" />Report information</div>
                      <div className="rm-info-grid">
                        {info.map(it => (
                          <div key={it.label} className={`rm-info${it.wide ? ' wide' : ''}`}>
                            <div className="rm-info-ic"><i className={`fas ${it.icon}`} /></div>
                            <div style={{ minWidth: 0 }}>
                              <div className="rm-info-label">{it.label}</div>
                              <div className="rm-info-value">{it.value}</div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="rm-section-title mt-4"><i className="fas fa-align-left" />Case details</div>
                      <p className={`rm-desc${r.description ? '' : ' muted'}`}>{r.description || 'No case details provided.'}</p>

                      {r.admin_notes && (
                        <div className="rm-admin">
                          <div className="rm-admin-head"><i className="fas fa-user-shield" />Note from the City Vet</div>
                          <p>{r.admin_notes}</p>
                        </div>
                      )}
                    </Col>
                    <Col lg={5}>
                      <div className="rm-section-title"><i className="fas fa-map-marker-alt" />Pinned location</div>
                      {r.latitude && r.longitude ? (
                        <div className="rm-map view">
                          <GoogleMapPicker lat={parseFloat(r.latitude)} lng={parseFloat(r.longitude)} readOnly={true} />
                        </div>
                      ) : (
                        <div className="rm-empty"><i className="fas fa-map-marker-alt" />No location was pinned for this report.</div>
                      )}
                    </Col>
                  </Row>
                </Modal.Body>
                <Modal.Footer className="rm-foot">
                  {canWithdraw && (
                    <button type="button" className="rp-btn danger-outline lg me-auto" onClick={() => { setShowViewModal(false); handleDeleteReport(r); }}>
                      <i className="fas fa-undo-alt" />Withdraw
                    </button>
                  )}
                  {canWithdraw && (
                    <button type="button" className="rp-btn ghost lg" onClick={() => { setShowViewModal(false); handleEditReport(r); }}>
                      <i className="fas fa-pen" />Edit
                    </button>
                  )}
                  <button type="button" className="rp-btn primary lg" onClick={() => setShowViewModal(false)}>Close</button>
                </Modal.Footer>
              </>
            );
          })()}
        </Modal>

        {/* ======================== EDIT MODAL ======================== */}
        <Modal show={showEditModal} onHide={() => !editLoading && setShowEditModal(false)} backdrop="static" dialogClassName="rm-modal" className="rp-zoom-modal" scrollable>
          <Modal.Header closeButton className="rm-head">
            <div className="rm-head-main">
              <div className="rm-head-ic"><i className="fas fa-pen" /></div>
              <div style={{ minWidth: 0 }}>
                <div className="rm-kicker">Edit report</div>
                <Modal.Title as="h5" className="rm-title">Update rabies case</Modal.Title>
                {reportToEdit && (
                  <div className="rm-num">#{reportToEdit.report_number || `RPT-${String(reportToEdit.id).padStart(6, '0')}`}</div>
                )}
              </div>
            </div>
          </Modal.Header>
          <Form onSubmit={confirmEdit} style={{ display: 'contents' }}>
            <Modal.Body className="rm-body">
              {editError && <div className="rm-alert danger"><i className="fas fa-exclamation-circle" /><span>{editError}</span></div>}
              <div className="rm-alert warn">
                <i className="fas fa-info-circle" />
                <span>This report is waiting for City Vet verification. You can update the address, contact number and case details.</span>
              </div>

              <div className="rm-section">
                <div className="rm-section-title"><i className="fas fa-map-marker-alt" />Case location</div>
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Label className="rm-label">Barangay</Form.Label>
                    <div className="rm-readonly">
                      <i className="fas fa-lock" />
                      {reportToEdit ? (barangays.find(b => b.id === parseInt(reportToEdit.barangay_id))?.name || 'Unknown') : ''}
                    </div>
                  </Col>
                  <Col md={6}>
                    <Form.Label className="rm-label">Contact number <span className="rm-req">*</span></Form.Label>
                    <Form.Control
                      className={`rm-input${editData.phone_number && !/^09\d{9}$/.test(editData.phone_number) ? ' bad' : editData.phone_number ? ' good' : ''}`}
                      type="tel" inputMode="numeric" maxLength={11} value={editData.phone_number}
                      onChange={e => setEditData(prev => ({ ...prev, phone_number: e.target.value }))}
                      onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) e.preventDefault(); }}
                      placeholder="09XXXXXXXXX" required disabled={editLoading}
                    />
                    {editData.phone_number && !/^09\d{9}$/.test(editData.phone_number) && (
                      <div className="rm-hint bad"><i className="fas fa-times-circle" />Must be 11 digits starting with 09</div>
                    )}
                  </Col>
                  <Col md={12}>
                    <Form.Label className="rm-label">Address <span className="rm-req">*</span></Form.Label>
                    <Form.Control className="rm-input" type="text" value={editData.address}
                      onChange={e => setEditData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="House no., street, purok / sitio…" required disabled={editLoading} />
                  </Col>
                </Row>
              </div>

              <div className="rm-section">
                <div className="rm-section-title"><i className="fas fa-align-left" />Case details</div>
                <Form.Control className="rm-input" as="textarea" rows={3} value={editData.description}
                  onChange={e => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the animal, symptoms observed, date of exposure, patient info (if any)…"
                  disabled={editLoading} />
              </div>

              {reportToEdit?.latitude && reportToEdit?.longitude && (
                <div className="rm-section mb-0">
                  <div className="rm-section-title"><i className="fas fa-map-pin" />Pinned location</div>
                  <div className="rm-map">
                    <GoogleMapPicker lat={parseFloat(reportToEdit.latitude)} lng={parseFloat(reportToEdit.longitude)} readOnly={true} />
                  </div>
                  <div className="rm-hint"><i className="fas fa-lock" />The location can't be changed after submission.</div>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer className="rm-foot">
              <button type="button" className="rp-btn ghost lg" onClick={() => setShowEditModal(false)} disabled={editLoading}>Cancel</button>
              <button type="submit" className="rp-btn primary lg" disabled={editLoading}>
                {editLoading ? <><i className="fas fa-circle-notch fa-spin" />Saving…</> : <><i className="fas fa-save" />Save changes</>}
              </button>
            </Modal.Footer>
          </Form>
        </Modal>

        {/* ======================== WITHDRAW MODAL ======================== */}
        <Modal show={showDeleteModal} onHide={() => !deleteLoading && setShowDeleteModal(false)} centered dialogClassName="cm-modal" className="rp-zoom-modal">
          {reportToDelete && (
            <>
              <Modal.Body className="cm-body">
                <div className="cm-icon" style={{ '--c': '#dc3545' }}><i className="fas fa-undo-alt" /></div>
                <h5 className="cm-title">Withdraw this report?</h5>
                <p className="cm-text">The rabies case will be removed and its danger zone taken off the map. This cannot be undone.</p>
                <div className="cm-item">
                  <div className="cm-item-av" style={{ background: 'rgba(220,53,69,0.1)', color: '#dc3545' }}><i className="fas fa-biohazard" /></div>
                  <div style={{ minWidth: 0 }}>
                    <div className="cm-item-name">Rabies case</div>
                    <div className="cm-item-meta">
                      #{reportToDelete.report_number || `RPT-${String(reportToDelete.id).padStart(6, '0')}`} · Brgy. {getBarangayName(reportToDelete.barangay_id)}
                    </div>
                  </div>
                </div>
              </Modal.Body>
              <Modal.Footer className="cm-foot">
                <button type="button" className="rp-btn ghost" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}>Keep report</button>
                <button type="button" className="rp-btn cm-confirm" style={{ '--c': '#dc3545' }} onClick={confirmDelete} disabled={deleteLoading}>
                  {deleteLoading ? <><i className="fas fa-circle-notch fa-spin" />Withdrawing…</> : <><i className="fas fa-undo-alt" />Withdraw</>}
                </button>
              </Modal.Footer>
            </>
          )}
        </Modal>

        {/* ======================== REVIEW & CONFIRM MODAL ======================== */}
        <Modal show={showConfirmModal} onHide={() => !submitLoading && setShowConfirmModal(false)} centered dialogClassName="cm-modal wide" className="rp-zoom-modal" scrollable style={{ zIndex: 1065 }} backdropClassName="rp-backdrop-top">
          {(() => {
            const rows = [
              { icon: 'fa-map', label: 'Barangay', value: barangays.find(b => b.id === parseInt(formData.barangay_id))?.name || '—' },
              { icon: 'fa-phone-alt', label: 'Contact no.', value: formData.phone_number || '—' },
              { icon: 'fa-home', label: 'Address', value: formData.address || '—', wide: true },
              { icon: 'fa-map-pin', label: 'Pinned location', value: formLat && formLng ? `${formLat.toFixed(5)}, ${formLng.toFixed(5)}` : 'Not pinned', mono: true, wide: true },
            ];
            return (
              <>
                <Modal.Body className="cm-body">
                  <div className="cm-icon" style={{ '--c': '#dc3545' }}><i className="fas fa-clipboard-check" /></div>
                  <h5 className="cm-title">Review rabies report</h5>
                  <p className="cm-text">Check the details before sending them to the City Vet for verification.</p>

                  <div className="rm-info-grid text-start">
                    {rows.map(it => (
                      <div key={it.label} className={`rm-info${it.wide ? ' wide' : ''}`}>
                        <div className="rm-info-ic"><i className={`fas ${it.icon}`} /></div>
                        <div style={{ minWidth: 0 }}>
                          <div className="rm-info-label">{it.label}</div>
                          <div className={`rm-info-value${it.mono ? ' rm-mono' : ''}`}>{it.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-start mt-3">
                    <div className="rm-info-label mb-1">Case details</div>
                    <p className={`rm-desc sm${formData.description ? '' : ' muted'}`}>{formData.description || 'No description provided.'}</p>
                  </div>

                  {imagePreviews.length > 0 && (
                    <div className="text-start mt-3">
                      <div className="rm-info-label mb-2">Photos ({imagePreviews.length})</div>
                      <div className="rm-photos">
                        {imagePreviews.map((src, i) => <div key={i} className="rm-thumb sm"><img src={src} alt={`Attachment ${i + 1}`} /></div>)}
                      </div>
                    </div>
                  )}

                  <div className="cm-note" style={{ '--c': '#b88a00' }}>
                    <i className="fas fa-shield-alt" /><span>Once verified, the case is marked Positive Rabies and the community is alerted.</span>
                  </div>
                </Modal.Body>
                <Modal.Footer className="cm-foot">
                  <button type="button" className="rp-btn ghost" onClick={() => setShowConfirmModal(false)} disabled={submitLoading}>
                    <i className="fas fa-arrow-left" />Edit
                  </button>
                  <button type="button" className="rp-btn primary" disabled={submitLoading}
                    onClick={async (e) => { setShowConfirmModal(false); await handleSubmit(e); }}>
                    {submitLoading ? <><i className="fas fa-circle-notch fa-spin" />Submitting…</> : <><i className="fas fa-paper-plane" />Submit report</>}
                  </button>
                </Modal.Footer>
              </>
            );
          })()}
        </Modal>
      </Container>
    </>
  );
};

export default ClinicReports;