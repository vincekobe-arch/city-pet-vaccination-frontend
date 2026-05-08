import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Modal, Table, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { reportsAPI, clinicAPI, handleAPIError } from '../../services/api';

const LEAFLET_CSS = `
  .leaflet-container { font-family: 'Segoe UI', sans-serif; }
  .custom-report-icon { background: none !important; border: none !important; }
  .report-marker {
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%; border: 3px solid white;
    box-shadow: 0 4px 14px rgba(0,0,0,0.38), 0 0 0 2px rgba(0,0,0,0.08);
    cursor: pointer; transition: transform 0.2s;
    width: 40px; height: 40px; overflow: hidden;
  }
  .report-marker img { width: 22px; height: 22px; object-fit: contain; }
  .report-marker:hover { transform: scale(1.22); }
  .marker-rabies      { background: linear-gradient(135deg,#ff4444,#cc0000); }
  .marker-suspected   { background: linear-gradient(135deg,#ffcc00,#e6a800); }
  .marker-animal-bite { background: linear-gradient(135deg,#ff7700,#cc5500); }
  .marker-rescue      { background: linear-gradient(135deg,#22bb55,#1a9944); }
  .marker-others      { background: linear-gradient(135deg,#6677ee,#4455cc); }
  .marker-pending     { background: linear-gradient(135deg,#aaaaaa,#777777); }
  .leaflet-popup-content-wrapper {
    border-radius: 16px !important;
    box-shadow: 0 8px 32px rgba(0,0,0,0.18) !important;
    border: none !important; padding: 0 !important; overflow: hidden;
  }
  .leaflet-popup-content { margin: 0 !important; }
  .leaflet-popup-tip-container { display: none; }
  .radius-label {
    background: transparent !important; border: none !important;
    box-shadow: none !important; font-weight: 700; font-size: 0.72rem;
    color: #333; text-align: center;
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

const MUNTINLUPA_CENTER = [14.4081, 121.0415];
const MUNTINLUPA_BOUNDS = [[14.34, 120.97], [14.50, 121.12]];

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
    if (window._printMapInst) { window._printMapInst.remove(); window._printMapInst = null; }

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
    btnBar.innerHTML = `<button onclick="document.getElementById('rabies-print-area').remove();if(window._printMapInst){window._printMapInst.remove();window._printMapInst=null;}window.__setPrinting&&window.__setPrinting(false);" style="background:#fff;color:#333;border:1.5px solid #ccc;border-radius:7px;padding:7px 18px;font-weight:700;font-size:0.8rem;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.1);">✕ Close</button>`;

    container.appendChild(topBar);
    container.appendChild(infoBar);
    container.appendChild(mapWrapper);
    container.appendChild(footer);
    container.appendChild(btnBar);
    document.body.appendChild(container);

    // Init Leaflet with EXACT hardcoded pixel dimensions — no offsetWidth needed
    const L = window.L;

    const useZoom = 15.5;

    setTimeout(() => {
      const pMap = L.map('print-map-inner', {
        center:     [lat, lng],
        zoom:       useZoom,
        zoomControl:      false,
        attributionControl: false,
        fadeAnimation:    false,
        markerZoomAnimation: false,
        zoomSnap:   0.25,
        zoomDelta:  0.25,
        renderer:   L.canvas(),
      });
      window._printMapInst = pMap;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, maxNativeZoom: 19,
      }).addTo(pMap);

      // 1km circle centered on exact report coordinates
      L.circle([lat, lng], {
        radius:      1000,
        color:       isPos ? '#cc0000' : '#c8a000',
        weight:      2.5,
        opacity:     0.9,
        fillColor:   isPos ? '#cc0000' : '#c8a000',
        fillOpacity: 0.08,
        dashArray:   isPos ? null : '7,5',
      }).addTo(pMap);

      // Subtle center dot using circleMarker (SVG-based, not a DOM marker)
      L.circleMarker([lat, lng], {
        radius:      5,
        color:       isPos ? 'rgba(180,0,0,0.5)' : 'rgba(160,120,0,0.5)',
        weight:      1.5,
        fillColor:   isPos ? 'rgba(180,0,0,0.2)' : 'rgba(160,120,0,0.2)',
        fillOpacity: 1,
        interactive: false,
      }).addTo(pMap);

      // Lock view to exact coordinates
      pMap.setView([lat, lng], useZoom, { animate: false });

      // Show container only after map is set

      let printed = false;
      let tilesLoading = 0;
      let tilesReady = false;
      let mapEventFired = false;

      const doPrint = () => {
        if (printed) return;
        if (!tilesReady && tilesLoading > 0) return; // tiles still pending
        printed = true;
        pMap.setView([lat, lng], useZoom, { animate: false });
        // Brief settle delay for final render pass, then print
        setTimeout(() => {
          container.style.visibility = 'visible';
          setTimeout(() => {
            window.print();
            setTimeout(() => {
              container.remove();
              if (window._printMapInst) { window._printMapInst.remove(); window._printMapInst = null; }
              if (printStyleEl) { printStyleEl.innerHTML = ''; }
              setIsPrinting(false);
            }, 1000);
          }, 400);
        }, 200);
      };

      // Track tile loading via Leaflet tile layer events
      pMap.eachLayer(layer => {
        if (layer instanceof L.TileLayer) {
          layer.on('loading', () => { tilesLoading++; tilesReady = false; });
          layer.on('load', () => {
            tilesLoading = Math.max(0, tilesLoading - 1);
            if (tilesLoading === 0) {
              tilesReady = true;
              if (mapEventFired) doPrint();
            }
          });
          layer.on('tileerror', () => {
            // Don't block printing on tile errors — just decrement and proceed
            tilesLoading = Math.max(0, tilesLoading - 1);
            if (tilesLoading === 0) {
              tilesReady = true;
              if (mapEventFired) doPrint();
            }
          });
        }
      });

      pMap.once('load', () => {
        mapEventFired = true;
        if (tilesReady || tilesLoading === 0) doPrint();
      });

      // Safety fallback: if map 'load' never fires (edge case), trigger after a generous delay
      // but only print if tiles are actually done
      const fallbackTimer = setTimeout(() => {
        mapEventFired = true;
        if (tilesReady || tilesLoading === 0) doPrint();
      }, 10000); // 10s max wait

      // Clear fallback if we already printed
      pMap.once('load', () => clearTimeout(fallbackTimer));
    }, 50);
  };
  
  const navigate = useNavigate();

  // Load Leaflet
  useEffect(() => {
    if (window.L) { setLeafletLoaded(true); return; }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => setLeafletLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => { loadReports(); loadClinics(); }, []);

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
      const res = await clinicAPI.getAll();
      setClinics((res.data.clinics || []).filter(c => c.is_active == 1 && c.latitude && c.longitude));
    } catch (err) {
      console.error('Failed to load clinics:', err);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      const res  = await reportsAPI.getAll();
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
    const L   = window.L;
    const map = L.map(mapRef.current, {
      center: MUNTINLUPA_CENTER, zoom: 13,
      minZoom: 12, maxZoom: 22,
      maxBounds: MUNTINLUPA_BOUNDS, maxBoundsViscosity: 0.7,
      zoomControl: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 22,
      maxNativeZoom: 19,
    }).addTo(map);

    // Style attribution to be subtle but still visible/compliant
    const style = document.createElement('style');
    style.innerHTML = `.leaflet-control-attribution { background: rgba(0,0,0,0.45) !important; color: #aaa !important; font-size: 0.62rem !important; padding: 2px 6px !important; border-radius: 4px 0 0 0 !important; } .leaflet-control-attribution a { color: #ccc !important; }`;
    document.head.appendChild(style);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    const boundary = [
      [14.4700,121.0200],[14.4650,121.0500],[14.4550,121.0700],[14.4400,121.0800],
      [14.4200,121.0750],[14.4000,121.0700],[14.3800,121.0600],[14.3600,121.0450],
      [14.3550,121.0250],[14.3650,121.0050],[14.3850,120.9980],[14.4050,120.9950],
      [14.4300,121.0000],[14.4550,121.0050],[14.4700,121.0200],
    ];
    L.polygon(boundary, {
      color: '#ffc107', weight: 2.5, opacity: 0.8,
      fillColor: '#ffc107', fillOpacity: 0, dashArray: '6,4',
    }).addTo(map);
    mapInstanceRef.current = map;
  }, [leafletLoaded]);

  // Render markers
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded) return;
    const L   = window.L;
    const map = mapInstanceRef.current;
    markersRef.current.forEach(m => map.removeLayer(m));
    circlesRef.current.forEach(c => map.removeLayer(c));
    markersRef.current = [];
    circlesRef.current = [];

    const filtered = reports.filter(r => {
      if (r.status === 'resolved') return false;
      if (filterStatus !== 'all' && r.status !== filterStatus) return false;
      if (filterType   !== 'all' && r.report_type !== filterType) return false;
      return r.latitude && r.longitude;
    });

    // Pre-compute which rabies reports need their own circle
    // (only if NOT within 1km of an already-circled report of same/higher severity)
    const rabiesReports = filtered.filter(r =>
      r.status === 'suspected_rabies' || r.status === 'positive_rabies'
    );

    // Sort: positive_rabies first so they "own" circles over suspected
    const sortedRabies = [...rabiesReports].sort((a, b) => {
      if (a.status === 'positive_rabies' && b.status !== 'positive_rabies') return -1;
      if (b.status === 'positive_rabies' && a.status !== 'positive_rabies') return 1;
      return 0;
    });

    // Haversine distance in meters
    const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
      const R = 6371000;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2)**2 +
                Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) *
                Math.sin(dLng/2)**2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    };

    // Track which reports get their own circle
    const circleOwners = []; // { lat, lng, status }

    sortedRabies.forEach(report => {
      const lat = parseFloat(report.latitude);
      const lng = parseFloat(report.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const isWithinExisting = circleOwners.some(owner => {
        // If existing owner is positive_rabies, it covers both types within 1km
        // If existing owner is suspected_rabies, it only groups suspected within 1km
        if (owner.status === 'positive_rabies') {
          return getDistanceMeters(lat, lng, owner.lat, owner.lng) <= 1000;
        }
        // suspected owner only groups same-type
        if (owner.status === 'suspected_rabies' && report.status === 'suspected_rabies') {
          return getDistanceMeters(lat, lng, owner.lat, owner.lng) <= 1000;
        }
        return false;
      });

      if (!isWithinExisting) {
        circleOwners.push({ lat, lng, status: report.status });
      }
    });

    // Draw circles only for circleOwners
    circleOwners.forEach(owner => {
      const isPos = owner.status === 'positive_rabies';
      const circle = L.circle([owner.lat, owner.lng], {
        radius: 1000,
        color:       isPos ? '#e00000' : '#f0c800',
        weight:      2.5, opacity: 0.85,
        fillColor:   isPos ? '#e00000' : '#f0c800',
        fillOpacity: isPos ? 0.12 : 0.10,
        dashArray:   isPos ? null : '6,4',
      }).addTo(map);
      const labelIcon = L.divIcon({
        className: 'radius-label',
        html: `<div style="background:${isPos?'rgba(220,0,0,0.85)':'rgba(220,180,0,0.9)'};color:#fff;padding:3px 8px;border-radius:10px;font-size:0.7rem;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);">1 km ${isPos?'⚠️ Danger Zone':'🔍 Alert Zone'}</div>`,
        iconAnchor: [40, 10],
      });
      const lm = L.marker([owner.lat + 0.0085, owner.lng], { icon: labelIcon, interactive: false }).addTo(map);
      circlesRef.current.push(circle, lm);
    });

    filtered.forEach(report => {
      const lat = parseFloat(report.latitude);
      const lng = parseFloat(report.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const markerClass = getMarkerClass(report);
      const imgSrc      = getMarkerImg(report);
      const icon = L.divIcon({
        className: 'custom-report-icon',
        html: `
          <div style="position:relative;width:28px;height:36px;display:flex;flex-direction:column;align-items:center;">
            <div class="report-marker ${markerClass}" style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;overflow:hidden;">
              <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
                <img src="${imgSrc}" alt="" style="width:14px;height:14px;object-fit:contain;" onerror="this.style.display='none';this.parentNode.innerHTML='${TYPE_CONFIG[report.report_type]?.fallback||'📌'}'" />
              </div>
            </div>
            <div style="width:3px;height:8px;background:rgba(0,0,0,0.25);border-radius:0 0 3px 3px;margin-top:-1px;"></div>
          </div>`,
        iconSize: [28, 36], iconAnchor: [14, 36], popupAnchor: [0, -38],
      });

      const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending;
      const typeCfg   = TYPE_CONFIG[report.report_type] || { label: report.report_type };

      const reportId = report.id;
      const popupHtml = `
        <div style="width:200px;font-family:'Segoe UI',sans-serif;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#f8f9fa,#e9ecef);padding:0.6rem 0.75rem;border-bottom:2px solid #ffc107;">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;">
              <img src="${imgSrc}" style="width:18px;height:18px;object-fit:contain;"
              <div>
                <div style="color:#b38600;font-weight:700;font-size:0.7rem;text-transform:uppercase;letter-spacing:0.4px">${typeCfg.label}</div>
                <div style="color:#999999;font-size:0.6rem;">${report.report_number || '#RPT-'+String(report.id).padStart(4,'0')}</div>
              </div>
            </div>
            <span style="display:inline-block;background:${statusCfg.color};color:#fff;padding:1px 8px;border-radius:20px;font-size:0.6rem;font-weight:700;">${statusCfg.label}</span>
          </div>
          <div style="padding:0.6rem 0.75rem;background:#fff;">
            <div style="margin-bottom:0.4rem;">
              <div style="font-size:0.58rem;color:#aaa;text-transform:uppercase;font-weight:700;letter-spacing:0.4px;margin-bottom:1px">Barangay</div>
              <div style="font-size:0.72rem;color:#222;font-weight:500;line-height:1.3">${report.barangay_name || 'Not specified'}</div>
            </div>
            <div style="display:flex;gap:0.35rem;margin-top:0.4rem;">
              ${report.phone_number ? `<div style="flex:1;background:#f8f9fa;padding:0.28rem 0.4rem;border-radius:5px;border:1px solid #eee"><div style="font-size:0.54rem;color:#aaa;font-weight:700;text-transform:uppercase">Phone</div><div style="font-size:0.65rem;color:#333;font-weight:600;margin-top:1px">${report.phone_number}</div></div>` : ''}
              <div style="flex:1;background:#f8f9fa;padding:0.28rem 0.4rem;border-radius:5px;border:1px solid #eee"><div style="font-size:0.54rem;color:#aaa;font-weight:700;text-transform:uppercase">Date</div><div style="font-size:0.65rem;color:#333;font-weight:600;margin-top:1px">${new Date(report.created_at).toLocaleDateString()}</div></div>
            </div>
            ${(report.status==='suspected_rabies'||report.status==='positive_rabies')?`<div style="margin-top:0.4rem;padding:0.3rem 0.5rem;background:${report.status==='positive_rabies'?'#ffe6e6':'#fffbe6'};border-radius:6px;border-left:3px solid ${statusCfg.color};font-size:0.62rem;font-weight:700;color:${report.status==='positive_rabies'?'#8b0000':'#7a6000'}">${report.status==='positive_rabies'?'⚠️ Danger Zone':'🔍 Alert Zone'}</div>`:''}
            <button
              onclick="window.dispatchEvent(new CustomEvent('viewReport', { detail: { id: ${reportId} } }))"
              style="margin-top:0.4rem;width:100%;padding:0.38rem;background:linear-gradient(135deg,#f8f9fa,#e9ecef);color:#333333;border:none;border-top:1px solid #dee2e6;${(report.status === 'suspected_rabies' || report.status === 'positive_rabies') ? '' : 'border-radius:0 0 6px 6px;'}font-size:0.65rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.3rem;"
              onmouseover="this.style.background='#e9ecef'"
              onmouseout="this.style.background='linear-gradient(135deg,#f8f9fa,#e9ecef)'"
            >
              👁️ View Full Details
            </button>
            ${(report.status === 'suspected_rabies' || report.status === 'positive_rabies') ? `
            <button
              onclick="window.dispatchEvent(new CustomEvent('printReport', { detail: { id: ${reportId} } }))"
              style="width:100%;padding:0.38rem;background:${report.status === 'positive_rabies' ? 'linear-gradient(135deg,#e00000,#8b0000)' : 'linear-gradient(135deg,#f0c800,#c8a000)'};color:${report.status === 'positive_rabies' ? '#fff' : '#1a1a1a'};border:none;border-radius:0 0 6px 6px;font-size:0.65rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:0.3rem;"
              onmouseover="this.style.opacity='0.88'"
              onmouseout="this.style.opacity='1'"
            >
              🖨️ Print 1km Zone Report
            </button>` : ''}
          </div>
        </div>`;

      const marker = L.marker([lat, lng], { icon }).addTo(map).bindPopup(popupHtml, { maxWidth: 220, minWidth: 200 });
      markersRef.current.push(marker);
    });
  }, [reports, filterStatus, filterType, leafletLoaded]);

  // ── Render clinic markers ──────────────────────────────────────────────────
  useEffect(() => {
    if (!mapInstanceRef.current || !leafletLoaded) return;
    const L   = window.L;
    const map = mapInstanceRef.current;

    // Remove old clinic markers
    clinicMarkersRef.current.forEach(m => map.removeLayer(m));
    clinicMarkersRef.current = [];

    // ── Hardcoded CityVet / City Hall marker ──
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
    const hardcoded = [cityVet];

    [...hardcoded, ...clinics].forEach(clinic => {
      const lat = parseFloat(clinic.latitude);
      const lng = parseFloat(clinic.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const isCityVet = clinic.id === 'cityvet';
      const icon = L.divIcon({
        className: 'custom-report-icon',
        html: isCityVet ? `
          <div style="position:relative;width:48px;height:58px;display:flex;flex-direction:column;align-items:center;">
            <!-- Pulse ring -->
            <div style="
              position:absolute;top:-6px;left:-6px;
              width:60px;height:60px;
              border-radius:50%;
              border:3px solid rgba(255,193,7,0.5);
              animation:cityvet-pulse 2s ease-out infinite;
            "></div>
            <!-- Main pin -->
            <div style="
              width:44px;height:44px;
              border-radius:50% 50% 50% 0;
              transform:rotate(-45deg);
              background:linear-gradient(135deg,#ffc107,#ff8c00);
              border:3px solid white;
              box-shadow:0 4px 16px rgba(255,193,7,0.7), 0 0 0 3px rgba(255,193,7,0.25);
              display:flex;align-items:center;justify-content:center;overflow:hidden;
              position:relative;z-index:1;
            ">
              <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
                <i class="fas fa-hospital" style="font-size:17px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,0.3);"></i>
              </div>
            </div>
            <div style="width:4px;height:10px;background:rgba(255,140,0,0.6);border-radius:0 0 4px 4px;margin-top:-1px;position:relative;z-index:1;"></div>
          </div>
          <style>
            @keyframes cityvet-pulse {
              0%   { transform: scale(0.9); opacity: 0.8; }
              70%  { transform: scale(1.4); opacity: 0; }
              100% { transform: scale(0.9); opacity: 0; }
            }
          </style>` : `
          <div style="position:relative;width:32px;height:40px;display:flex;flex-direction:column;align-items:center;">
            <div style="
              width:32px;height:32px;
              border-radius:50% 50% 50% 0;
              transform:rotate(-45deg);
              background:linear-gradient(135deg,#0d6efd,#0a58ca);
              border:2.5px solid white;
              box-shadow:0 3px 10px rgba(13,110,253,0.5);
              display:flex;align-items:center;justify-content:center;overflow:hidden;
            ">
              <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
                <i class="fas fa-hospital" style="font-size:13px;color:#fff;"></i>
              </div>
            </div>
            <div style="width:3px;height:8px;background:rgba(13,110,253,0.4);border-radius:0 0 3px 3px;margin-top:-1px;"></div>
          </div>`,
        iconSize:   isCityVet ? [48, 58] : [32, 40],
        iconAnchor: isCityVet ? [24, 58] : [16, 40],
        popupAnchor: [0, isCityVet ? -60 : -42],
      });

      const popupHtml = `
        <div style="width:210px;font-family:'Segoe UI',sans-serif;overflow:hidden;">
          <div style="background:${isCityVet ? 'linear-gradient(135deg,#ffc107,#ff8c00)' : 'linear-gradient(135deg,#0d6efd,#0a58ca)'};padding:0.6rem 0.75rem;">
            <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem;">
              <div style="width:28px;height:28px;background:rgba(255,255,255,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                <i class="fas fa-hospital" style="font-size:13px;color:#fff;"></i>
              </div>
              <div>
                <div style="color:${isCityVet ? '#1a1a1a' : '#fff'};font-weight:700;font-size:0.72rem;line-height:1.2;">${clinic.clinic_name}</div>
                <div style="color:${isCityVet ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.65)'};font-size:0.6rem;">${clinic.clinic_code || ''}</div>
              </div>
            </div>
            <span style="display:inline-block;background:rgba(255,255,255,0.2);color:${isCityVet ? '#1a1a1a' : '#fff'};padding:1px 8px;border-radius:20px;font-size:0.6rem;font-weight:700;">
              🏥 ${isCityVet ? 'Government Clinic' : 'Private Clinic'}
            </span>
          </div>
          <div style="padding:0.65rem 0.75rem;background:#fff;display:flex;flex-direction:column;gap:0.4rem;">
            ${clinic.owner_name ? `
              <div>
                <div style="font-size:0.58rem;color:#aaa;text-transform:uppercase;font-weight:700;letter-spacing:0.4px;">Veterinarian</div>
                <div style="font-size:0.72rem;color:#222;font-weight:600;margin-top:1px;">Dr. ${clinic.owner_name}</div>
              </div>` : ''}
            
            <div style="display:flex;gap:0.35rem;margin-top:0.2rem;">
              ${clinic.phone ? `
                <div style="flex:1;background:#f8f9fa;padding:0.28rem 0.4rem;border-radius:5px;border:1px solid #eee;">
                  <div style="font-size:0.54rem;color:#aaa;font-weight:700;text-transform:uppercase;">Phone</div>
                  <div style="font-size:0.65rem;color:#333;font-weight:600;margin-top:1px;">${clinic.phone}</div>
                </div>` : ''}
              ${clinic.specialization ? `
                <div style="flex:1;background:#e8f0fe;padding:0.28rem 0.4rem;border-radius:5px;border:1px solid #c5d8fc;">
                  <div style="font-size:0.54rem;color:#5577aa;font-weight:700;text-transform:uppercase;">Specialty</div>
                  <div style="font-size:0.62rem;color:#0d6efd;font-weight:700;margin-top:1px;">${clinic.specialization}</div>
                </div>` : ''}
            </div>
            ${clinic.vaccinations_administered ? `
              <div style="margin-top:0.2rem;padding:0.3rem 0.5rem;background:#e8f0fe;border-radius:6px;border-left:3px solid #0d6efd;font-size:0.65rem;font-weight:700;color:#0d6efd;">
                💉 ${clinic.vaccinations_administered} vaccinations administered
              </div>` : ''}
          </div>
        </div>`;

      const marker = L.marker([lat, lng], { icon })
        .addTo(map)
        .bindPopup(popupHtml, { maxWidth: 230, minWidth: 210 });

      clinicMarkersRef.current.push(marker);
    });
  }, [clinics, leafletLoaded]);

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

      <Container fluid className="py-4" style={{ background: '#ffffff', minHeight: '100vh', zoom: '0.75' }}>

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
onClick={() => { setIsFullscreen(f => !f); setTimeout(() => mapInstanceRef.current?.invalidateSize(), 300); }}                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
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
              </div>

              
            </Card>
          </Col>
        </Row>
      </Container>
    
      </>
  );
}