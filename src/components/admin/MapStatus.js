import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Modal, Table, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { reportsAPI, clinicAPI, handleAPIError } from '../../services/api';

const LEAFLET_CSS = `
  .gm-style .gm-style-iw-c {
    padding: 0 !important;
    border-radius: 16px !important;
    background: #0d1424 !important;
    border: 1px solid rgba(255,255,255,0.12) !important;
    box-shadow: 0 12px 36px rgba(0,0,0,0.55) !important;
    overflow: hidden !important;
  }
  .gm-style .gm-style-iw-d { overflow: hidden !important; padding: 0 !important; max-height: none !important; }
  .gm-style .gm-style-iw-tc { display: none !important; }
  .gm-style .gm-style-iw-ch { display: none !important; }
  .gm-style .gm-style-iw-chr {
    position: absolute !important; top: 6px !important; right: 6px !important;
    height: auto !important; z-index: 3;
  }
  .gm-style .gm-ui-hover-effect {
    top: 0 !important; right: 0 !important;
    width: 26px !important; height: 26px !important;
    background: rgba(255,255,255,0.14) !important;
    backdrop-filter: blur(6px);
    border: 1px solid rgba(255,255,255,0.25) !important;
    border-radius: 50% !important;
    opacity: 1 !important;
  }
  .gm-style .gm-ui-hover-effect > span {
    margin: 6px !important; width: 12px !important; height: 12px !important;
    background-color: #ffffff !important;
  }
`;

const STATUS_CONFIG = {
  pending:          { color: '#888888', label: 'Pending',          icon: '📋', bg: '#f0f0f0', text: '#555' },
  suspected_rabies: { color: '#f0c800', label: 'Suspected Rabies', icon: '⚠️', bg: '#fff9cc', text: '#7a6000' },
  positive_rabies:  { color: '#e00000', label: 'Positive Rabies',  icon: '☣️', bg: '#ffe6e6', text: '#8b0000' },
  ongoing:          { color: '#22bb55', label: 'Ongoing',          icon: '🔄', bg: '#e6f9ee', text: '#145c30' },
  resolved:         { color: '#0088ff', label: 'Resolved',         icon: '✅', bg: '#e6f0ff', text: '#003d7a' },
};

const TYPE_CONFIG = {
  rabies_case:   { img: '/rabies.png',        label: 'Rabies Case',   markerClass: 'marker-rabies',       fallback: '🦠' },
  animal_bite:   { img: '/animal_bite.png',   label: 'Animal Bite',   markerClass: 'marker-animal-bite',  fallback: '🐾' },
  animal_rescue: { img: '/animal_rescue.png', label: 'Animal Rescue', markerClass: 'marker-rescue',       fallback: '🐕' },
  others:        { img: '/others.png',        label: 'Others',        markerClass: 'marker-others',       fallback: '📌' },
};

const getMarkerClass = (report) => {
  if (report.status === 'positive_rabies')  return 'marker-rabies';
  if (report.status === 'suspected_rabies') return 'marker-suspected';
  if (report.status === 'pending')          return 'marker-pending';
  return TYPE_CONFIG[report.report_type]?.markerClass || 'marker-others';
};

const getMarkerImg = (report) => {
  if (report.status === 'positive_rabies' || report.status === 'suspected_rabies')
    return TYPE_CONFIG['rabies_case'].img;
  return TYPE_CONFIG[report.report_type]?.img || TYPE_CONFIG['others'].img;
};

const withRetry = async (fn, retries = 3, delay = 800) => {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.response?.status;
      // only retry server errors / network errors, not 4xx
      if (i === retries || (status && status < 500)) throw err;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
};

const GOOGLE_MAPS_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || 'AIzaSyB72rFhd2GZd0PKiWSI_duS5WXDWXQb0To';

const MUNTINLUPA_CENTER = [14.4081, 121.0415];
const MUNTINLUPA_BOUNDS = [[14.34, 120.97], [14.50, 121.12]];

const BOUNDARY = [
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

const MAP_STYLES = [
  { elementType:'geometry', stylers:[{ color:'#0d1424' }] },
  { elementType:'labels.text.stroke', stylers:[{ color:'#0d1424' }] },
  { elementType:'labels.text.fill', stylers:[{ color:'#7d8aa5' }] },
  { featureType:'administrative', elementType:'geometry.stroke', stylers:[{ color:'#2a3550' }] },
  { featureType:'administrative.locality', elementType:'labels.text.fill', stylers:[{ color:'#a9b4cc' }] },
  { featureType:'poi', elementType:'labels', stylers:[{ visibility:'off' }] },
  { featureType:'poi.park', elementType:'geometry', stylers:[{ color:'#10231f' }] },
  { featureType:'road', elementType:'geometry', stylers:[{ color:'#1c2640' }] },
  { featureType:'road', elementType:'geometry.stroke', stylers:[{ color:'#0d1424' }] },
  { featureType:'road', elementType:'labels.text.fill', stylers:[{ color:'#6b7896' }] },
  { featureType:'road.highway', elementType:'geometry', stylers:[{ color:'#2b3858' }] },
  { featureType:'road.highway', elementType:'geometry.stroke', stylers:[{ color:'#1c2640' }] },
  { featureType:'road.highway', elementType:'labels.text.fill', stylers:[{ color:'#9aa6c2' }] },
  { featureType:'transit', elementType:'geometry', stylers:[{ color:'#15203a' }] },
  { featureType:'water', elementType:'geometry', stylers:[{ color:'#060a14' }] },
  { featureType:'water', elementType:'labels.text.fill', stylers:[{ color:'#3d4a6b' }] },
];

const getDistMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000, dLat = (lat2-lat1)*Math.PI/180, dLng = (lng2-lng1)*Math.PI/180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// Flag pin color + emoji per report
const getPinMeta = (report) => {
  if (report.status === 'positive_rabies')  return { color: '#e00000', emoji: '☣️' };
  if (report.status === 'suspected_rabies') return { color: '#f0c800', emoji: '⚠️' };
  if (report.status === 'pending')          return { color: '#888888', emoji: '📋' };
  if (report.report_type === 'animal_bite')   return { color: '#ff7700', emoji: '🐾' };
  if (report.report_type === 'animal_rescue') return { color: '#22bb55', emoji: '🐕' };
  if (report.report_type === 'rabies_case')   return { color: '#e00000', emoji: '🦠' };
  return { color: '#6677ee', emoji: '📌' };
};

const makeFlagIcon = (color, emoji) => ({
  url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
      <rect x="6" y="2" width="20" height="14" rx="3" fill="${color}" stroke="white" stroke-width="1.5"/>
      <text x="16" y="13" text-anchor="middle" font-size="9">${emoji}</text>
      <rect x="5" y="2" width="2.5" height="40" rx="1.2" fill="white"/>
      <ellipse cx="6.25" cy="42" rx="4" ry="1.8" fill="rgba(0,0,0,0.18)"/>
    </svg>`)}`,
  scaledSize: new window.google.maps.Size(36, 48),
  anchor: new window.google.maps.Point(6, 48),
});

export default function MapStatus() {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef     = useRef([]);
  const circlesRef     = useRef([]);

  const [reports,       setReports]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [leafletLoaded, setLeafletLoaded] = useState(false);
  const [filterStatus,  setFilterStatus]  = useState('all');
  const [filterType,    setFilterType]    = useState('all');
  const [stats,         setStats]         = useState({});
  const [isFullscreen,  setIsFullscreen]  = useState(false);
  const [clinics,       setClinics]       = useState([]);
  const clinicMarkersRef = useRef([]);
  const infoWindowRef    = useRef(null);
  const [mapReady,       setMapReady]     = useState(false);

  const printMapRef = useRef(null);
  const printMapInstanceRef = useRef(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // REPLACE the entire handlePrintReport function with this:

  const handlePrintReport = (report) => {
    if (isPrinting) return; // block multiple clicks
    const lat = parseFloat(report.latitude);
    const lng = parseFloat(report.longitude);
    if (isNaN(lat) || isNaN(lng)) return;
    setIsPrinting(true);
    window.__setPrinting = setIsPrinting;

    const isPos = report.status === 'positive_rabies';
    const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
    const typeCfg   = TYPE_CONFIG[report.report_type] || { label: report.report_type };

    // Clean up previous
    const old = document.getElementById('rabies-print-area');
    if (old) old.remove();
    window._printMapInst = null;

    // Print styles
    let printStyleEl = document.getElementById('rabies-print-style');
    if (!printStyleEl) {
      printStyleEl = document.createElement('style');
      printStyleEl.id = 'rabies-print-style';
      document.head.appendChild(printStyleEl);
    }
    printStyleEl.innerHTML = `
      @media print {
        @page { margin: 0; size: A4 landscape; }
        body > *:not(#rabies-print-area) { display: none !important; visibility: hidden !important; }
        #rabies-print-area {
          display: flex !important; flex-direction: column !important;
          position: fixed !important; inset: 0 !important;
          width: 100vw !important; height: 100vh !important;
          z-index: 99999 !important; background: #fff !important;
        }
        .no-print { display: none !important; }
        #print-map-inner svg { overflow: visible !important; }
      }
    `;

    // Build container — fully isolated, fixed size matching A4 landscape
    const PRINT_W = 1122; // A4 landscape px at 96dpi
    const PRINT_H = 793;
    const MAP_H   = PRINT_H - 90; // subtract header+infobar+footer height

    const container = document.createElement('div');
    container.id = 'rabies-print-area';
    container.style.cssText = `
      position: fixed; left: 0; top: 0;
      width: ${PRINT_W}px; height: ${PRINT_H}px;
      background: #fff; z-index: 99999;
      display: flex; flex-direction: column;
      font-family: "Segoe UI", Arial, sans-serif;
      overflow: hidden; visibility: hidden;
    `;

    // Top bar
    const topBar = document.createElement('div');
    topBar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 28px;border-bottom:2px solid #222;flex-shrink:0;background:#fff;height:44px;box-sizing:border-box;';
    topBar.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:1px;">
        <div style="font-size:0.95rem;font-weight:700;color:#111;">
          ${isPos ? 'Positive Rabies — 1km Danger Zone Report' : 'Suspected Rabies — 1km Alert Zone Report'}
        </div>
        <div style="font-size:0.65rem;color:#555;">Muntinlupa City Animal Rabies Control System</div>
      </div>
      `;

    // Info bar
    const infoBar = document.createElement('div');
    infoBar.style.cssText = 'display:flex;gap:2rem;padding:5px 28px;background:#f7f7f7;border-bottom:1px solid #ddd;flex-shrink:0;font-size:0.7rem;color:#333;align-items:center;height:28px;box-sizing:border-box;flex-wrap:nowrap;overflow:hidden;';
    infoBar.innerHTML = `
      <div><span style="font-weight:700;color:#888;text-transform:uppercase;font-size:0.6rem;letter-spacing:0.4px;">Barangay&nbsp;</span>${report.barangay_name || '—'}</div>
      <div style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><span style="font-weight:700;color:#888;text-transform:uppercase;font-size:0.6rem;letter-spacing:0.4px;">Address&nbsp;</span>${report.address || '—'}</div>`;

    // Map wrapper — exact fixed size, fully isolated
    const mapWrapper = document.createElement('div');
    mapWrapper.style.cssText = `position:relative;width:${PRINT_W}px;height:${MAP_H}px;flex-shrink:0;overflow:hidden;`;

    const mapDiv = document.createElement('div');
    mapDiv.id = 'print-map-inner';
    mapDiv.style.cssText = `width:${PRINT_W}px;height:${MAP_H}px;`;
    mapWrapper.appendChild(mapDiv);

    // Footer
    const footer = document.createElement('div');
    footer.style.cssText = 'padding:4px 28px;border-top:1px solid #ddd;display:flex;justify-content:space-between;flex-shrink:0;font-size:0.6rem;color:#aaa;background:#fff;height:18px;box-sizing:border-box;align-items:center;';
    footer.innerHTML = ``;

    // Close button (screen only)
    const btnBar = document.createElement('div');
    btnBar.className = 'no-print';
    btnBar.style.cssText = 'position:absolute;bottom:12px;right:12px;z-index:100000;';
    btnBar.innerHTML = `<button onclick="document.getElementById('rabies-print-area').remove();window._printMapInst=null;window.__setPrinting&&window.__setPrinting(false);" style="background:#fff;color:#333;border:1.5px solid #ccc;border-radius:7px;padding:7px 18px;font-weight:700;font-size:0.8rem;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.1);">✕ Close</button>`;

    container.appendChild(topBar);
    container.appendChild(infoBar);
    container.appendChild(mapWrapper);
    container.appendChild(footer);
    container.appendChild(btnBar);
    document.body.appendChild(container);

        setTimeout(() => {
      const google = window.google;
      const zoom = 15;
      const pMap = new google.maps.Map(document.getElementById('print-map-inner'), {
        center: { lat, lng },
        zoom,
        disableDefaultUI: true,
        gestureHandling: 'none',
        keyboardShortcuts: false,
        clickableIcons: false,
      });
      window._printMapInst = pMap;

      // 1km zone
      new google.maps.Circle({
        map: pMap,
        center: { lat, lng },
        radius: 1000,
        strokeColor:   isPos ? '#cc0000' : '#c8a000',
        strokeOpacity: 0.9,
        strokeWeight:  2.5,
        fillColor:     isPos ? '#cc0000' : '#c8a000',
        fillOpacity:   0.08,
        clickable: false,
      });

      // Center dot
      new google.maps.Marker({
        position: { lat, lng },
        map: pMap,
        clickable: false,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 5,
          fillColor:   isPos ? '#b40000' : '#a07800',
          fillOpacity: 0.35,
          strokeColor: isPos ? '#b40000' : '#a07800',
          strokeWeight: 1.5,
        },
      });

      let printed = false;
      const doPrint = () => {
        if (printed) return;
        printed = true;
        setTimeout(() => {
          container.style.visibility = 'visible';
          setTimeout(() => {
            window.print();
            setTimeout(() => {
              container.remove();
              window._printMapInst = null;
              if (printStyleEl) { printStyleEl.innerHTML = ''; }
              setIsPrinting(false);
            }, 1000);
          }, 400);
        }, 300);
      };

      google.maps.event.addListenerOnce(pMap, 'tilesloaded', doPrint);
      setTimeout(doPrint, 10000); // safety fallback
    }, 50);
  };
  
  const navigate = useNavigate();

    // Load Google Maps
  useEffect(() => {
    if (window.google && window.google.maps) { setLeafletLoaded(true); return; }
    let script = document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]');
    if (!script) {
      script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    const onLoad = () => setLeafletLoaded(true);
    script.addEventListener('load', onLoad);
    return () => script.removeEventListener('load', onLoad);
  }, []);

  useEffect(() => {
  (async () => {
    await loadReports();
    await loadClinics();
  })();
}, []);

  useEffect(() => {
    const handler = (e) => {
      navigate('/admin/reports', { state: { openReportId: e.detail.id } });
    };
    const printHandler = (e) => {
      const report = reports.find(r => r.id === e.detail.id);
      if (report) handlePrintReport(report);
    };
    window.addEventListener('viewReport', handler);
    window.addEventListener('printReport', printHandler);
    return () => {
      window.removeEventListener('viewReport', handler);
      window.removeEventListener('printReport', printHandler);
    };
  }, [navigate, reports, isPrinting]);

  const loadClinics = async () => {
    try {
      const res = await withRetry(() => clinicAPI.getAll());
      setClinics((res.data.clinics || []).filter(c => c.is_active == 1 && c.latitude && c.longitude));
    } catch (err) {
      console.error('Failed to load clinics:', err);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const res  = await withRetry(() => reportsAPI.getAll());
      const data = res.data.reports || [];
      setReports(data);
      const s = {};
      Object.keys(STATUS_CONFIG).forEach(k => { s[k] = data.filter(r => r.status === k).length; });
      s.total = data.length;
      setStats(s);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

    // Init map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return;

    const initMap = () => {
      if (!mapRef.current) return;
      const el = mapRef.current;
      if (!el.offsetWidth || !el.offsetHeight) { setTimeout(initMap, 150); return; }

      const google = window.google;
      const map = new google.maps.Map(el, {
        center: { lat: MUNTINLUPA_CENTER[0], lng: MUNTINLUPA_CENTER[1] },
        zoom: 13,
        minZoom: 8,
        maxZoom: 22,
        gestureHandling: 'greedy',
        zoomControl: false,
        cameraControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        restriction: {
          latLngBounds: {
            north: MUNTINLUPA_BOUNDS[1][0],
            south: MUNTINLUPA_BOUNDS[0][0],
            west:  MUNTINLUPA_BOUNDS[0][1],
            east:  MUNTINLUPA_BOUNDS[1][1],
          },
          strictBounds: false,
        },
        backgroundColor: '#0d1424',
        styles: MAP_STYLES,
      });

      new google.maps.Polygon({
        paths: BOUNDARY.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: '#ffc107',
        strokeOpacity: 0.8,
        strokeWeight: 2.5,
        fillColor: '#ffc107',
        fillOpacity: 0,
        map,
      });

      infoWindowRef.current = new google.maps.InfoWindow();
      map.addListener('click', () => infoWindowRef.current && infoWindowRef.current.close());

      mapInstanceRef.current = map;
      setMapReady(true);
    };

    initMap();
  }, [leafletLoaded]);

  // Render report markers + zones
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;
    const google = window.google;
    const map = mapInstanceRef.current;

    markersRef.current.forEach(m => m.setMap(null));
    circlesRef.current.forEach(c => c.setMap(null));
    markersRef.current = [];
    circlesRef.current = [];

    const filtered = reports.filter(r => {
      if (r.status === 'resolved') return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterType   !== 'all' && r.report_type !== filterType) return false;
      return r.latitude && r.longitude;
    });

    const sortedRabies = filtered
      .filter(r => r.status === 'suspected_rabies' || r.status === 'positive_rabies')
      .sort((a, b) => {
        if (a.status === 'positive_rabies' && b.status !== 'positive_rabies') return -1;
        if (b.status === 'positive_rabies' && a.status !== 'positive_rabies') return 1;
        return 0;
      });

    const circleOwners = [];
    sortedRabies.forEach(report => {
      const lat = parseFloat(report.latitude);
      const lng = parseFloat(report.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      const isWithin = circleOwners.some(owner => {
        if (owner.status === 'positive_rabies') return getDistMeters(lat, lng, owner.lat, owner.lng) <= 1000;
        if (owner.status === 'suspected_rabies' && report.status === 'suspected_rabies') return getDistMeters(lat, lng, owner.lat, owner.lng) <= 1000;
        return false;
      });
      if (!isWithin) circleOwners.push({ lat, lng, status: report.status });
    });

    circleOwners.forEach(owner => {
      const isPos = owner.status === 'positive_rabies';
      try {
        const circle = new google.maps.Circle({
          map,
          center: { lat: owner.lat, lng: owner.lng },
          radius: 1000,
          strokeColor:   isPos ? '#e00000' : '#f0c800',
          strokeOpacity: 0.85,
          strokeWeight:  2.5,
          fillColor:     isPos ? '#e00000' : '#f0c800',
          fillOpacity:   isPos ? 0.12 : 0.10,
          clickable: false,
        });
        const labelMarker = new google.maps.Marker({
          position: { lat: owner.lat + 0.0085, lng: owner.lng },
          map,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg"/>',
            scaledSize: new google.maps.Size(1, 1),
          },
          label: {
            text: `1 km ${isPos ? '⚠️ Danger Zone' : '🔍 Alert Zone'}`,
            color: '#fff',
            fontSize: '0.7rem',
            fontWeight: 'bold',
          },
          clickable: false,
        });
        circlesRef.current.push(circle, labelMarker);
      } catch (e) {
        console.warn('Circle render skipped:', e.message);
      }
    });

    filtered.forEach(report => {
      const lat = parseFloat(report.latitude);
      const lng = parseFloat(report.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const { color, emoji } = getPinMeta(report);
      const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
      const typeCfg   = TYPE_CONFIG[report.report_type] || { label: report.report_type, fallback: '📌' };
      const isRabies  = report.status === 'suspected_rabies' || report.status === 'positive_rabies';
      const isPos     = report.status === 'positive_rabies';
      const reportId  = report.id;
      const headBg    = isPos ? 'linear-gradient(135deg,#b30000,#e00000)'
                      : report.status === 'suspected_rabies' ? 'linear-gradient(135deg,#d4aa00,#f0c800)'
                      : `linear-gradient(135deg,${color},${color}cc)`;
      const headTxt   = report.status === 'suspected_rabies' ? '#1a1a1a' : '#fff';
      const headSub   = report.status === 'suspected_rabies' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)';

      const popupHtml = `
        <div style="width:220px;font-family:'Segoe UI',sans-serif;overflow:hidden;background:#0d1424;">
          <div style="background:${headBg};padding:0.75rem 0.9rem;">
            <div style="font-size:1.2rem;margin-bottom:0.3rem;">${emoji}</div>
            <div style="color:${headTxt};font-weight:700;font-size:0.8rem;padding-right:22px;">${typeCfg.label}</div>
            <div style="color:${headSub};font-size:0.62rem;margin-top:2px;">${report.report_number || '#RPT-' + String(report.id).padStart(4, '0')}</div>
            <span style="display:inline-block;margin-top:0.4rem;background:rgba(255,255,255,0.22);color:${headTxt};padding:1px 8px;border-radius:20px;font-size:0.6rem;font-weight:700;">${statusCfg.label}</span>
          </div>
          <div style="padding:0.7rem 0.9rem;background:#0d1424;">
            <div style="margin-bottom:0.4rem;">
              <div style="font-size:0.58rem;color:#7d8aa5;text-transform:uppercase;font-weight:700;letter-spacing:0.4px;">Barangay</div>
              <div style="font-size:0.78rem;color:#e8ecf5;font-weight:600;margin-top:2px;">${report.barangay_name || 'Not specified'}</div>
            </div>
            <div style="display:flex;gap:0.35rem;margin-top:0.4rem;">
              ${report.phone_number ? `<div style="flex:1;background:rgba(255,255,255,0.06);padding:0.3rem 0.45rem;border-radius:6px;border:1px solid rgba(255,255,255,0.12);"><div style="font-size:0.54rem;color:#7d8aa5;font-weight:700;text-transform:uppercase;">Phone</div><div style="font-size:0.65rem;color:#e8ecf5;font-weight:600;margin-top:1px;">${report.phone_number}</div></div>` : ''}
              <div style="flex:1;background:rgba(255,255,255,0.06);padding:0.3rem 0.45rem;border-radius:6px;border:1px solid rgba(255,255,255,0.12);"><div style="font-size:0.54rem;color:#7d8aa5;font-weight:700;text-transform:uppercase;">Date</div><div style="font-size:0.65rem;color:#e8ecf5;font-weight:600;margin-top:1px;">${new Date(report.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</div></div>
            </div>
            ${isRabies ? `<div style="margin-top:0.5rem;padding:0.4rem 0.55rem;background:${isPos ? 'rgba(224,0,0,0.15)' : 'rgba(240,200,0,0.12)'};border-radius:8px;border-left:3px solid ${color};font-size:0.65rem;font-weight:700;color:${isPos ? '#ff8a8a' : '#ffe066'};">${isPos ? '⚠️ Danger Zone — 1km radius' : '🔍 Alert Zone — 1km radius'}</div>` : ''}
            <button
              onclick="window.dispatchEvent(new CustomEvent('viewReport', { detail: { id: ${reportId} } }))"
              style="margin-top:0.55rem;width:100%;padding:0.42rem;background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.2);border-radius:8px;font-size:0.65rem;font-weight:700;cursor:pointer;"
              onmouseover="this.style.background='rgba(255,255,255,0.2)'"
              onmouseout="this.style.background='rgba(255,255,255,0.1)'"
            >👁️ View Full Details</button>
            ${isRabies ? `
            <button
              onclick="window.dispatchEvent(new CustomEvent('printReport', { detail: { id: ${reportId} } }))"
              style="margin-top:0.35rem;width:100%;padding:0.42rem;background:${isPos ? 'linear-gradient(135deg,#e00000,#8b0000)' : 'linear-gradient(135deg,#f0c800,#c8a000)'};color:${isPos ? '#fff' : '#1a1a1a'};border:none;border-radius:8px;font-size:0.65rem;font-weight:700;cursor:pointer;"
              onmouseover="this.style.opacity='0.88'"
              onmouseout="this.style.opacity='1'"
            >🖨️ Print 1km Zone Report</button>` : ''}
          </div>
        </div>`;

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        icon: makeFlagIcon(color, emoji),
      });
      marker.addListener('click', () => {
        infoWindowRef.current.setContent(popupHtml);
        infoWindowRef.current.open({ map, anchor: marker });
      });
      markersRef.current.push(marker);
    });
  }, [reports, filterStatus, filterType, mapReady]);

  // ── Render clinic markers ──
  useEffect(() => {
    if (!mapInstanceRef.current || !mapReady) return;
    const google = window.google;
    const map = mapInstanceRef.current;

    clinicMarkersRef.current.forEach(m => m.setMap(null));
    clinicMarkersRef.current = [];

    const cityVet = {
      id: 'cityvet',
      clinic_name: 'City Veterinary Office',
      clinic_code: 'CITYVET-MNL',
      owner_name: 'City Veterinarian',
      phone: null,
      specialization: 'Government Veterinary Office',
      vaccinations_administered: null,
      latitude: 14.395293,
      longitude: 121.044737,
    };

    [cityVet, ...clinics].forEach(clinic => {
      const lat = parseFloat(clinic.latitude);
      const lng = parseFloat(clinic.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const isCityVet = clinic.id === 'cityvet';

      const popupHtml = `
        <div style="width:220px;font-family:'Segoe UI',sans-serif;overflow:hidden;background:#0d1424;">
          <div style="background:${isCityVet ? 'linear-gradient(135deg,#ffc107,#ff8c00)' : 'linear-gradient(135deg,#0d6efd,#0a58ca)'};padding:0.75rem 0.9rem;">
            <div style="margin-bottom:0.3rem;">
              <div style="color:${isCityVet ? '#1a1a1a' : '#fff'};font-weight:700;font-size:0.78rem;line-height:1.2;padding-right:22px;">${clinic.clinic_name}</div>
              <div style="color:${isCityVet ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.7)'};font-size:0.6rem;">${isCityVet ? 'Government Veterinary Office' : (clinic.clinic_code || '')}</div>
            </div>
            <span style="display:inline-block;background:rgba(255,255,255,0.22);color:${isCityVet ? '#1a1a1a' : '#fff'};padding:1px 8px;border-radius:20px;font-size:0.6rem;font-weight:700;">
              🏥 ${isCityVet ? 'City Government Clinic' : 'Private Clinic'}
            </span>
          </div>
          <div style="padding:0.7rem 0.9rem;background:#0d1424;display:flex;flex-direction:column;gap:0.4rem;">
            ${clinic.owner_name ? `<div><div style="font-size:0.58rem;color:#7d8aa5;text-transform:uppercase;font-weight:700;letter-spacing:0.4px;">Veterinarian</div><div style="font-size:0.75rem;color:#e8ecf5;font-weight:600;margin-top:1px;">${isCityVet ? clinic.owner_name : 'Dr. ' + clinic.owner_name}</div></div>` : ''}
            <div style="display:flex;gap:0.35rem;margin-top:0.2rem;">
              ${clinic.phone ? `<div style="flex:1;background:rgba(255,255,255,0.06);padding:0.3rem 0.45rem;border-radius:6px;border:1px solid rgba(255,255,255,0.12);"><div style="font-size:0.54rem;color:#7d8aa5;font-weight:700;text-transform:uppercase;">Phone</div><div style="font-size:0.65rem;color:#e8ecf5;font-weight:600;margin-top:1px;">${clinic.phone}</div></div>` : ''}
              ${clinic.specialization ? `<div style="flex:1;background:rgba(13,110,253,0.15);padding:0.3rem 0.45rem;border-radius:6px;border:1px solid rgba(13,110,253,0.4);"><div style="font-size:0.54rem;color:#8fb4ff;font-weight:700;text-transform:uppercase;">Specialty</div><div style="font-size:0.62rem;color:#6ea8ff;font-weight:700;margin-top:1px;">${clinic.specialization}</div></div>` : ''}
            </div>
            ${clinic.vaccinations_administered ? `<div style="margin-top:0.2rem;padding:0.4rem 0.55rem;background:rgba(13,110,253,0.15);border-radius:8px;border-left:3px solid #0d6efd;font-size:0.65rem;font-weight:700;color:#8fb4ff;">💉 ${clinic.vaccinations_administered} vaccinations administered</div>` : ''}
          </div>
        </div>`;

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        zIndex: isCityVet ? 1000 : 500,
        icon: isCityVet ? {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="52" height="64" viewBox="0 0 52 64">
              <ellipse cx="7" cy="62" rx="6" ry="2.2" fill="rgba(0,0,0,0.18)"/>
              <rect x="5" y="2" width="4" height="58" rx="2" fill="#d4d4d4"/>
              <rect x="5" y="2" width="2" height="58" rx="2" fill="#f0f0f0"/>
              <rect x="9" y="2" width="40" height="28" rx="5" fill="#ffc107"/>
              <rect x="9" y="2" width="40" height="8" rx="5" fill="#ffd54f"/>
              <rect x="9" y="7" width="40" height="3" fill="#ffd54f"/>
              <rect x="25" y="8" width="7" height="16" rx="2" fill="white"/>
              <rect x="19" y="13" width="19" height="6" rx="2" fill="white"/>
              <circle cx="28.5" cy="16" r="3" fill="#ffc107"/>
              <circle cx="44" cy="7" r="6" fill="#1a1a1a"/>
              <circle cx="44" cy="7" r="5" fill="none" stroke="#ffc107" stroke-width="1"/>
              <text x="44" y="10.5" text-anchor="middle" font-size="7" fill="#ffc107" font-family="Arial" font-weight="bold">★</text>
            </svg>`
          )}`,
          scaledSize: new google.maps.Size(52, 64),
          anchor: new google.maps.Point(7, 64),
        } : {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="54" viewBox="0 0 44 54">
              <ellipse cx="6" cy="52" rx="5" ry="1.8" fill="rgba(0,0,0,0.18)"/>
              <rect x="4" y="2" width="3.5" height="49" rx="1.8" fill="#d4d4d4"/>
              <rect x="4" y="2" width="1.8" height="49" rx="1.8" fill="#f0f0f0"/>
              <rect x="8" y="2" width="34" height="24" rx="4" fill="#0d6efd"/>
              <rect x="8" y="2" width="34" height="7" rx="4" fill="#4d94ff"/>
              <rect x="8" y="7" width="34" height="2" fill="#4d94ff"/>
              <rect x="22" y="7" width="5.5" height="13" rx="1.5" fill="white"/>
              <rect x="16.5" y="11" width="16" height="5" rx="1.5" fill="white"/>
              <circle cx="24.5" cy="13.5" r="2.5" fill="#0d6efd"/>
              <circle cx="37" cy="6.5" r="5" fill="#0a3d91"/>
              <text x="37" y="9.5" text-anchor="middle" font-size="6" fill="white" font-family="Arial" font-weight="bold">Rx</text>
            </svg>`
          )}`,
          scaledSize: new google.maps.Size(44, 54),
          anchor: new google.maps.Point(5.5, 54),
        },
      });
      marker.addListener('click', () => {
        infoWindowRef.current.setContent(popupHtml);
        infoWindowRef.current.open({ map, anchor: marker });
      });
      clinicMarkersRef.current.push(marker);
    });
  }, [clinics, mapReady]);

  const zoomBy = (d) => {
    const m = mapInstanceRef.current;
    if (m) m.setZoom((m.getZoom() || 13) + d);
  };
  const recenter = () => {
    const m = mapInstanceRef.current;
    if (!m) return;
    m.panTo({ lat: MUNTINLUPA_CENTER[0], lng: MUNTINLUPA_CENTER[1] });
    m.setZoom(13);
  };
  const glassBtn = {
    width: '40px', height: '40px', border: 'none',
    background: 'rgba(255,255,255,0.12)', color: '#fff',
    backdropFilter: 'blur(6px)', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.9rem',
  };

  const filteredCount = reports.filter(r => {
    if (r.status === 'resolved') return false;
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterType   !== 'all' && r.report_type !== filterType) return false;
    return r.latitude && r.longitude;
  }).length;

  const total = stats.total || 1;

  // Progress bar data
  const progressItems = [
    { key: 'positive_rabies',  label: 'Positive Rabies',  color: '#e00000', trackColor: 'rgba(224,0,0,0.12)' },
    { key: 'suspected_rabies', label: 'Suspected Rabies', color: '#f0c800', trackColor: 'rgba(240,200,0,0.15)' },
    { key: 'ongoing',          label: 'Ongoing',          color: '#22bb55', trackColor: 'rgba(34,187,85,0.12)' },
    { key: 'pending',          label: 'Pending',          color: '#888',    trackColor: 'rgba(136,136,136,0.12)' },
    { key: 'resolved',         label: 'Resolved',         color: '#0088ff', trackColor: 'rgba(0,136,255,0.12)' },
  ];

  const btnStyle = (active, color = '#ffc107') => ({
    padding: '0.38rem 0.85rem',
    borderRadius: '20px',
    border: `2px solid ${active ? color : 'rgba(0,0,0,0.12)'}`,
    background: active ? color : 'rgba(0,0,0,0.04)',
    color: active ? (color === '#ffc107' ? '#1a1a1a' : '#fff') : '#555555',
    fontWeight: '600',
    fontSize: '0.76rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  });

  return (
    <>
      <style>{LEAFLET_CSS}</style>
<style>{`
  @media (max-width: 768px) {
    .mobile-title { font-size: 1.5rem !important; }
  }
`}</style>
      {isPrinting && (
        <div style={{
          position: 'fixed', bottom: '28px', left: '0', right: '0', margin: '0 auto', width: 'fit-content',
          background: '#1a1a1a', color: '#fff', padding: '11px 22px',
          borderRadius: '12px', zIndex: 999999,
          display: 'flex', alignItems: 'center', gap: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
          fontSize: '0.82rem', fontWeight: '600',
          fontFamily: '"Segoe UI", sans-serif',
          animation: 'dropDown 0.3s ease-out',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          <div style={{
            width: '15px', height: '15px',
            border: '2px solid rgba(255,255,255,0.25)',
            borderTop: '2px solid #fff',
            borderRadius: '50%',
            animation: 'spin 0.75s linear infinite',
            flexShrink: 0,
          }} />
          Preparing zone report for printing...
        </div>
      )}
      <style>{`
        @keyframes dropDown { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes fillBar  { from{width:0} to{width:var(--target-width)} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        .dashboard-page {
          zoom: 0.75;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        @media (min-width: 1600px) { .dashboard-page { zoom: 0.9; } }
        @media (min-width: 1920px) { .dashboard-page { zoom: 1; } }
        .filter-btn:hover { transform:translateY(-2px); box-shadow:0 3px 10px rgba(0,0,0,0.2); }
        .filter-wrap { position: relative; }
        .filter-wrap .tip {
          position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%) translateY(4px);
          background: rgba(0,0,0,0.85); color: #fff; font-size: 0.68rem; font-weight: 600;
          padding: 4px 9px; border-radius: 6px; white-space: nowrap; pointer-events: none;
          opacity: 0; transition: opacity 0.18s ease, transform 0.18s ease; z-index: 10003;
        }
        .filter-wrap:hover .tip { opacity: 1; transform: translateX(-50%) translateY(0px); }
        .map-fullscreen { position:fixed !important;top:0 !important;left:0 !important;width:100vw !important;height:100vh !important;z-index:10002 !important;border-radius:0 !important;margin:0 !important; }
        .progress-bar-fill { animation: fillBar 1.1s cubic-bezier(.4,0,.2,1) forwards; }
        .panel-row { display:flex; gap:1rem; }
        @media print {
          body * { visibility: hidden !important; }
          #rabies-print-area, #rabies-print-area * { visibility: visible !important; }
          #rabies-print-area { position: fixed !important; left: 0; top: 0; width: 100vw; height: 100vh; z-index: 99999; background: #fff; }
        }
      `}</style>

      <Container fluid className="py-4 dashboard-page" style={{ background: '#ffffff', minHeight: '100vh' }}>

        {/* ── Header (unchanged) ── */}
        <Row className="mb-4" style={{ animation: 'dropDown 0.4s ease-out' }}>
          <Col>
            <div className="d-flex align-items-center gap-2">
              <i className="fas fa-map-marked-alt" style={{ fontSize: '1.5rem', color: '#1a1a1a', animation: 'float 3s ease-in-out infinite' }}></i>
              <div>
                <h2 className="mobile-title" style={{ fontWeight: '700', color: '#333', fontSize: '1.9rem', marginBottom: 0 }}>Map Status</h2>
                <small style={{ color: '#888', fontWeight: '500' }}>Muntinlupa City — Live Report Monitoring</small>
              </div>
            </div>
          </Col>
          
        </Row>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError('')}
            style={{ borderRadius: '12px', border: '2px solid #dc3545', marginBottom: '1.5rem' }}>
            <i className="fas fa-exclamation-triangle me-2"></i>{error}
          </Alert>
        )}

        {/* ── Main Layout: Map + Side Panel ── */}
        <Row className="g-3" style={{ animation: 'dropDown 0.4s ease-out 0.15s backwards' }}>

          {/* ── Side Panel ── */}
          <Col lg={3} className="order-2 order-lg-1" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Report Distribution */}
            <Card className="border-0" style={{ borderRadius: '18px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', overflow: 'hidden', background: '#fff' }}>
              <div style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', padding: '1rem 1.25rem', borderBottom: '2px solid #ffc107' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-chart-bar" style={{ color: '#ffc107', fontSize: '0.9rem' }}></i>
                  <span style={{ color: '#333333', fontWeight: '700', fontSize: '0.88rem', letterSpacing: '0.3px' }}>Report Distribution</span>
                </div>
                <div style={{ color: '#999999', fontSize: '0.72rem', marginTop: '2px' }}>
                {loading ? '—' : `${total} total reports · ${clinics.length} clinics`}
              </div>
              </div>
              <div style={{ padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {progressItems.map((item, i) => {
                  const count = stats[item.key] || 0;
                  const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={item.key} style={{ animationDelay: `${0.1 + i * 0.07}s` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                          <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#444' }}>{item.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#222' }}>{loading ? '—' : count}</span>
                          <span style={{ fontSize: '0.68rem', color: '#aaa', fontWeight: '500' }}>{loading ? '' : `${pct}%`}</span>
                        </div>
                      </div>
                      <div style={{ height: '7px', borderRadius: '10px', background: item.trackColor, overflow: 'hidden', border: `1px solid ${item.trackColor}` }}>
                        <div
                          className="progress-bar-fill"
                          style={{
                            height: '100%',
                            borderRadius: '10px',
                            background: item.color,
                            '--target-width': `${pct}%`,
                            width: loading ? '0%' : `${pct}%`,
                            transition: 'width 1s cubic-bezier(.4,0,.2,1)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Type Breakdown */}
            <Card className="border-0" style={{ borderRadius: '18px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', overflow: 'hidden', background: '#fff' }}>
              <div style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', padding: '1rem 1.25rem', borderBottom: '2px solid #ffc107' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-layer-group" style={{ color: '#ffc107', fontSize: '0.9rem' }}></i>
                  <span style={{ color: '#333333', fontWeight: '700', fontSize: '0.88rem' }}>By Report Type</span>
                </div>
              </div>
              <div style={{ padding: '1.1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
                  const count = reports.filter(r => r.report_type === key).length;
                  const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                  const colors = { rabies_case: '#e00000', animal_bite: '#ff7700', animal_rescue: '#22bb55', others: '#6677ee' };
                  const c = colors[key];
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <img src={cfg.img} alt={cfg.label}
                            style={{ width: '18px', height: '18px', objectFit: 'contain' }}
                            onError={e => { e.target.style.display = 'none'; }}
                          />
                          <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#444' }}>{cfg.label}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#222' }}>{loading ? '—' : count}</span>
                          <span style={{ fontSize: '0.68rem', color: '#aaa' }}>{loading ? '' : `${pct}%`}</span>
                        </div>
                      </div>
                      <div style={{ height: '6px', borderRadius: '10px', background: `${c}18`, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '10px', background: c, width: loading ? '0%' : `${pct}%`, transition: 'width 1s cubic-bezier(.4,0,.2,1)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Legend */}
            <Card className="border-0" style={{ borderRadius: '18px', boxShadow: '0 4px 20px rgba(0,0,0,0.07)', background: '#fff', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', padding: '1rem 1.25rem', borderBottom: '2px solid #ffc107' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <i className="fas fa-circle-info" style={{ color: '#ffc107', fontSize: '0.9rem' }}></i>
                  <span style={{ color: '#333333', fontWeight: '700', fontSize: '0.88rem' }}>Map Legend</span>
                </div>
              </div>
              <div style={{ padding: '1rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {[
                  { img: '/rabies.png',        label: 'Rabies / Positive',  color: '#e00000' },
                  { img: '/rabies.png',        label: 'Suspected Rabies',   color: '#f0c800' },
                  { img: '/animal_bite.png',   label: 'Animal Bite',        color: '#ff7700' },
                  { img: '/animal_rescue.png', label: 'Animal Rescue',      color: '#22bb55' },
                  { img: '/others.png',        label: 'Others',             color: '#6677ee' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: l.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: `0 2px 8px ${l.color}55` }}>
                      <img src={l.img} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }} onError={e => e.target.style.display = 'none'} />
                    </div>
                    <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#444' }}>{l.label}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#0d6efd', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(13,110,253,0.4)' }}>
                    <i className="fas fa-hospital" style={{ fontSize: '13px', color: '#fff' }}></i>
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#444' }}>Private Clinic</span>
                </div>
                <div style={{ marginTop: '0.4rem', paddingTop: '0.75rem', borderTop: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '30px', height: '10px', borderRadius: '4px', border: '2px dashed #f0c800', background: 'rgba(240,200,0,0.15)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.73rem', color: '#7a6000', fontWeight: '600' }}>1km Alert Zone</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <div style={{ width: '30px', height: '10px', borderRadius: '4px', border: '2px solid #e00000', background: 'rgba(220,0,0,0.12)', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.73rem', color: '#8b0000', fontWeight: '600' }}>1km Danger Zone</span>
                  </div>
                </div>
              </div>
            </Card>
          </Col>

          {/* ── Map Column ── */}
          <Col lg={9} className="order-1 order-lg-2">
            <Card className={`border-0 ${isFullscreen ? 'map-fullscreen' : ''}`}
  style={{ borderRadius: isFullscreen ? '0' : '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', ...(isFullscreen && { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 10002, zoom: '1.333' }) }}>
              {/* Map Header Bar */}
              <div style={{ background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', padding: isFullscreen ? '0.5rem 1rem' : '0.9rem 1.25rem', transition: 'padding 0.3s ease', borderBottom: '2px solid #ffc107' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: isFullscreen ? '0.4rem' : '0.75rem', marginBottom: isFullscreen ? '0.4rem' : '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <i className="fas fa-map" style={{ color: '#ffc107', fontSize: '1rem' }}></i>
                    <span style={{ color: '#333333', fontWeight: '700', fontSize: '0.95rem' }}>Muntinlupa City Reports Map</span>
                    <span style={{ background: 'rgba(255,193,7,0.15)', color: '#b38600', padding: '2px 10px', borderRadius: '20px', fontSize: '0.73rem', fontWeight: '700' }}>
                      {loading ? '...' : `${filteredCount} pins`}
                    </span>
                  </div>
                  <button
onClick={() => {
                      setIsFullscreen(f => !f);
                      setTimeout(() => {
                        if (mapInstanceRef.current && window.google) {
                          window.google.maps.event.trigger(mapInstanceRef.current, 'resize');
                        }
                      }, 300);
                    }}
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    style={{ background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.15)', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
onMouseOut={e  => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'}
                  >
                    <i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'}`} style={{ fontSize: '0.82rem', color: '#333333' }}></i>
                  </button>
                </div>

                {/* Status + Type Filters — single line */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ color: '#999999', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status:</span>
                  {[
                    { v: 'all',              label: 'All',              icon: '🗺️', color: '#ffc107' },
                    { v: 'pending',          label: 'Pending',          icon: '📋', color: '#888' },
                    { v: 'suspected_rabies', label: 'Suspected Rabies', icon: '⚠️', color: '#f0c800' },
                    { v: 'positive_rabies',  label: 'Positive Rabies',  icon: '☣️', color: '#e00000' },
                    { v: 'ongoing',          label: 'Ongoing',          icon: '🔄', color: '#22bb55' },
                  ].map(f => (
                    <div key={f.v} className="filter-wrap">
                      <button className="filter-btn" onClick={() => setFilterStatus(f.v)} style={{ ...btnStyle(filterStatus === f.v, f.color), padding: '0.38rem 0.55rem', fontSize: '1rem', lineHeight: 1 }}>
                        {f.icon}
                      </button>
                      <div className="tip">{f.label}</div>
                    </div>
                  ))}

                  <div style={{ width: '1px', height: '20px', background: 'rgba(0,0,0,0.12)', margin: '0 0.1rem' }} />

                  <span style={{ color: '#999999', fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type:</span>
                  {[
                    { v: 'all',           label: 'All Types',    icon: '🗂️', img: null,                color: '#ffc107' },
                    { v: 'rabies_case',   label: 'Rabies Case',  icon: null, img: '/rabies.png',        color: '#e00000' },
                    { v: 'animal_bite',   label: 'Animal Bite',  icon: null, img: '/animal_bite.png',   color: '#ff7700' },
                    { v: 'animal_rescue', label: 'Animal Rescue',icon: null, img: '/animal_rescue.png', color: '#22bb55' },
                    { v: 'others',        label: 'Others',       icon: null, img: '/others.png',        color: '#6677ee' },
                  ].map(f => (
                    <div key={f.v} className="filter-wrap">
                      <button className="filter-btn" onClick={() => setFilterType(f.v)}
                        style={{ ...btnStyle(filterType === f.v, f.color), padding: '0.38rem 0.55rem', fontSize: '1rem', lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        {f.img
                          ? <img src={f.img} alt="" style={{ width: '15px', height: '15px', objectFit: 'contain', filter: filterType === f.v ? (f.color === '#ffc107' ? 'none' : 'brightness(0) invert(1)') : 'brightness(0) invert(0.6)' }} onError={e => e.target.style.display='none'} />
                          : f.icon}
                      </button>
                      <div className="tip">{f.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Map */}
              <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
                {loading && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                    <Spinner animation="border" style={{ color: '#ffc107', width: '2.5rem', height: '2.5rem', borderWidth: '3px' }} />
                    <span style={{ fontWeight: '600', color: '#555' }}>Loading reports...</span>
                  </div>
                )}
                <div ref={mapRef} style={{ height: isFullscreen ? 'calc(100vh - 110px)' : '100%', minHeight: isFullscreen ? 'unset' : '530px', width: '100%', display: 'block' }} />

                {/* Custom glass controls */}
                <div style={{ position: 'absolute', right: 14, bottom: 34, zIndex: 5, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)' }}>
                    <button onClick={recenter} title="Recenter map" style={glassBtn}><i className="fas fa-crosshairs"></i></button>
                  </div>
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.3)' }}>
                    <button onClick={() => zoomBy(1)} title="Zoom in" style={glassBtn}><i className="fas fa-plus"></i></button>
                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.3)' }} />
                    <button onClick={() => zoomBy(-1)} title="Zoom out" style={glassBtn}><i className="fas fa-minus"></i></button>
                  </div>
                </div>
              </div>

              
            </Card>
          </Col>
        </Row>
      </Container>
    
      </>
  );
}