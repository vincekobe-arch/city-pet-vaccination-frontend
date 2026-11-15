import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { reportsAPI, clinicAPI } from '../services/api';

/* ─── Scroll-reveal hook ─── */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return; }
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

const MUNTI_CENTER = [14.4081, 121.0415];
const MUNTI_BOUNDS = [[14.34, 120.97], [14.50, 121.12]];
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

const getDistMeters = (lat1,lng1,lat2,lng2) => {
  const R=6371000, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};

/* ── static content ── */
const SERVICES = [
  { image:'vaccine.png',       icon:'fa-syringe',            label:'Vaccination',   description:'Anti-rabies and other vaccination drives held in barangays across the city.',  color:'#10b981' },
  { image:'sterilization.png', icon:'fa-cut',                label:'Sterilization', description:'Spay and neuter programs that help control the stray animal population.',      color:'#8b5cf6' },
  { image:'microchip.png',     icon:'fa-microchip',          label:'Microchipping', description:'Permanent pet identification so lost pets can be traced back to their owners.', color:'#0ea5e9' },
  { image:'seminar.png',       icon:'fa-chalkboard-teacher', label:'Seminars',      description:'Learn about responsible pet ownership, rabies prevention, and proper care.',     color:'#f59e0b' },
];

const FEATURES = [
  { icon:'fa-paw',            title:'Pet Registration',     label:'Pet Profiles',      description:'Register your pets and get a registration number and QR code for each one.' },
  { icon:'fa-calendar-check', title:'Event Registration',   label:'Event Management',  description:'Find upcoming veterinary events in your area and reserve a slot for your pet.' },
  { icon:'fa-id-card',        title:'Digital Vet Cards',    label:'Health Records',    description:"View your pet's vaccination and deworming history anytime from your phone." },
  { icon:'fa-qrcode',         title:'Pet QR Code',          label:'Identification',    description:"Anyone who scans your pet's QR code can see its basic profile and contact the owner." },
  { icon:'fa-bullhorn',       title:'Incident Reporting',   label:'Community Safety',  description:'Report rabies cases, animal bites, and animals needing rescue with a pinned location.' },
  { icon:'fa-chart-line',     title:'City Vet Management',  label:'Admin Tools',       description:'The City Veterinary Office manages records, events, inventory, and reports in one place.' },
];

const STEPS = [
  { icon:'fa-user-plus',      title:'Create an account', text:'Sign up with your email and verify your identity.' },
  { icon:'fa-paw',            title:'Register your pets', text:'Add your pets and receive their QR codes.' },
  { icon:'fa-calendar-check', title:'Join vet events',    text:'Book vaccination and other services near you.' },
];

const MAP_FEATURES = [
  { icon:'fa-map-marked-alt', color:'#e00000', title:'Rabies Case Mapping', desc:'See confirmed and suspected rabies cases reported across Muntinlupa City.' },
  { icon:'fa-hospital',       color:'#0d6efd', title:'Nearby Vet Clinics',  desc:'Locate the City Veterinary Office and registered private clinics.' },
  { icon:'fa-radiation-alt',  color:'#d4a800', title:'1 km Alert Zones',    desc:'Danger and alert zones are drawn automatically around active cases.' },
  { icon:'fa-shield-alt',     color:'#10b981', title:'Pet Safety Tips',     desc:'Know what to do when a rabies case is reported near your area.' },
];

/* image with icon fallback */
const IconImage = ({ src, icon, color, size }) => {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <i className={`fas ${icon}`} style={{ fontSize: size * 0.45, color }} />;
  return <img src={src} alt="" style={{ width: size * 0.8, height: size * 0.8, objectFit: 'contain' }} onError={() => setFailed(true)} />;
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const [canHover, setCanHover] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: -400, y: -400 });

  const [servicesRef, servicesVisible] = useReveal();
  const [stepsRef, stepsVisible] = useReveal();
  const [featuresRef, featuresVisible] = useReveal();
  const [mapSectionRef, mapSectionVisible] = useReveal();

  /* Google Map */
  const mapElRef         = useRef(null);
  const mapInstanceRef   = useRef(null);
  const markersRef       = useRef([]);
  const circlesRef       = useRef([]);
  const clinicMarkersRef = useRef([]);
  const [mapsLoaded, setMapsLoaded] = useState(false);
  const [mapReady,   setMapReady]   = useState(false);
  const [mapError,   setMapError]   = useState(false);
  const [mapReports, setMapReports] = useState([]);
  const [mapClinics, setMapClinics] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  /* scroll (throttled with requestAnimationFrame) */
  useEffect(() => {
    let ticking = false;
    const h = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { setScrollY(window.scrollY); ticking = false; });
    };
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  /* mouse glow — desktop only */
  useEffect(() => {
    const mq = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
    if (!mq || !mq.matches) return;
    setCanHover(true);
    const h = (e) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  /* load Google Maps JS */
  useEffect(() => {
    if (window.google && window.google.maps) { setMapsLoaded(true); return; }
    const existing = document.querySelector('script[data-gmaps]');
    if (existing) {
      existing.addEventListener('load', () => setMapsLoaded(true));
      existing.addEventListener('error', () => setMapError(true));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyB72rFhd2GZd0PKiWSI_duS5WXDWXQb0To';
    script.async = true;
    script.defer = true;
    script.dataset.gmaps = '1';
    script.onload = () => setMapsLoaded(true);
    script.onerror = () => setMapError(true);
    document.head.appendChild(script);
  }, []);

  /* fetch real data */
  useEffect(() => {
    const load = async () => {
      try {
        const [rRes, cRes] = await Promise.all([reportsAPI.getMapReports(), clinicAPI.getAll()]);
        const rabies = (rRes.data.reports || []).filter(r =>
          r.status === 'positive_rabies' || r.status === 'suspected_rabies'
        );
        const clinics = (cRes.data.clinics || []).filter(c => c.is_active == 1 && c.latitude && c.longitude);
        setMapReports(rabies);
        setMapClinics(clinics);
      } catch (e) { /* silent — map still loads */ }
      finally { setDataLoaded(true); }
    };
    load();
  }, []);

  /* init Google Map — bounds locked to Muntinlupa */
  useEffect(() => {
    if (!mapsLoaded || !mapElRef.current || mapInstanceRef.current) return;
    let timer;

    const initMap = () => {
      if (!mapElRef.current) return;
      const el = mapElRef.current;
      if (!el.offsetWidth || !el.offsetHeight) { timer = setTimeout(initMap, 150); return; }

      const google = window.google;
      const map = new google.maps.Map(el, {
        center: { lat: MUNTI_CENTER[0], lng: MUNTI_CENTER[1] },
        zoom: 13,
        minZoom: 12,
        maxZoom: 22,
        gestureHandling: 'cooperative', // page scrolls normally; two fingers / ctrl+scroll to move map
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
        restriction: {
          latLngBounds: {
            north: MUNTI_BOUNDS[1][0],
            south: MUNTI_BOUNDS[0][0],
            west:  MUNTI_BOUNDS[0][1],
            east:  MUNTI_BOUNDS[1][1],
          },
          strictBounds: true,
        },
        backgroundColor: '#0d1424',
        styles: [
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
        ],
      });

      new google.maps.Polygon({
        paths: BOUNDARY.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: '#ffc107',
        strokeOpacity: 0.8,
        strokeWeight: 2.5,
        fillOpacity: 0,
        clickable: false,
        map,
      });

      mapInstanceRef.current = map;
      setMapReady(true);
    };

    initMap();
    return () => clearTimeout(timer);
  }, [mapsLoaded]);

  /* report markers + 1 km zones */
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const google = window.google;
    const map    = mapInstanceRef.current;

    markersRef.current.forEach(m => m.setMap(null));
    circlesRef.current.forEach(c => c.setMap(null));
    markersRef.current = [];
    circlesRef.current = [];

    const sorted = [...mapReports].sort((a,b) =>
      a.status==='positive_rabies' && b.status!=='positive_rabies' ? -1 :
      b.status==='positive_rabies' && a.status!=='positive_rabies' ?  1 : 0
    );

    const circleOwners = [];
    sorted.forEach(r => {
      const lat = parseFloat(r.latitude), lng = parseFloat(r.longitude);
      if (isNaN(lat)||isNaN(lng)) return;
      const within = circleOwners.some(o => {
        if (o.status==='positive_rabies') return getDistMeters(lat,lng,o.lat,o.lng)<=1000;
        if (o.status==='suspected_rabies'&&r.status==='suspected_rabies') return getDistMeters(lat,lng,o.lat,o.lng)<=1000;
        return false;
      });
      if (!within) circleOwners.push({ lat, lng, status: r.status });
    });

    circleOwners.forEach(o => {
      const isPos = o.status === 'positive_rabies';
      try {
        const circle = new google.maps.Circle({
          map,
          center: { lat: o.lat, lng: o.lng },
          radius: 1000,
          strokeColor:   isPos ? '#e00000' : '#f0c800',
          strokeOpacity: 0.85,
          strokeWeight:  2,
          fillColor:     isPos ? '#e00000' : '#f0c800',
          fillOpacity:   isPos ? 0.12 : 0.10,
          clickable: false,
        });
        const labelMarker = new google.maps.Marker({
          position: { lat: o.lat + 0.0085, lng: o.lng },
          map,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg"/>',
            scaledSize: new google.maps.Size(1, 1),
          },
          label: {
            text: `1 km ${isPos ? 'Danger Zone' : 'Alert Zone'}`,
            color: '#fff',
            fontSize: '11px',
            fontWeight: 'bold',
          },
          clickable: false,
        });
        circlesRef.current.push(circle, labelMarker);
      } catch(e) {
        console.warn('Circle render skipped:', e.message);
      }
    });

    sorted.forEach(r => {
      const lat=parseFloat(r.latitude), lng=parseFloat(r.longitude);
      if (isNaN(lat)||isNaN(lng)) return;
      const isPos = r.status==='positive_rabies';
      const color = isPos?'#e00000':'#f0c800';
      const emoji = isPos?'☣️':'⚠️';

      const m = new google.maps.Marker({
        position: { lat, lng },
        map,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
              <circle cx="14" cy="14" r="13" fill="${color}" stroke="white" stroke-width="2"/>
              <text x="14" y="19" text-anchor="middle" font-size="13">${emoji}</text>
              <rect x="12" y="27" width="4" height="9" rx="2" fill="rgba(0,0,0,0.25)"/>
            </svg>`)}`,
          scaledSize: new google.maps.Size(28, 36),
          anchor: new google.maps.Point(14, 36),
        },
        clickable: false,
      });
      markersRef.current.push(m);
    });
  }, [mapReports, mapReady]);

  /* clinic markers */
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;
    const google = window.google;
    const map    = mapInstanceRef.current;

    clinicMarkersRef.current.forEach(m => m.setMap(null));
    clinicMarkersRef.current = [];

    const cityVet = { id:'cityvet', latitude:14.395293, longitude:121.044737 };

    [cityVet, ...mapClinics].forEach(clinic => {
      const lat=parseFloat(clinic.latitude), lng=parseFloat(clinic.longitude);
      if (isNaN(lat)||isNaN(lng)) return;
      const isCityVet = clinic.id==='cityvet';
      const w = isCityVet ? 48 : 32, h = isCityVet ? 58 : 40;
      const c = isCityVet ? 24 : 16, r = isCityVet ? 20 : 14;

      const m = new google.maps.Marker({
        position: { lat, lng },
        map,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
              <circle cx="${c}" cy="${isCityVet?22:16}" r="${r}" fill="${isCityVet?'#ffc107':'#0d6efd'}" stroke="white" stroke-width="2.5"/>
              <text x="${c}" y="${isCityVet?28:21}" text-anchor="middle" font-size="${isCityVet?16:12}" fill="white">🏥</text>
              <rect x="${c-2}" y="${isCityVet?42:30}" width="4" height="${isCityVet?10:8}" rx="2" fill="rgba(0,0,0,0.25)"/>
            </svg>`)}`,
          scaledSize: new google.maps.Size(w, h),
          anchor: new google.maps.Point(c, h),
        },
        clickable: false,
      });
      clinicMarkersRef.current.push(m);
    });
  }, [mapClinics, mapReady]);

  const positiveCount  = mapReports.filter(r => r.status === 'positive_rabies').length;
  const suspectedCount = mapReports.filter(r => r.status === 'suspected_rabies').length;
  const goToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="lp-root">
      <style>{`
        .lp-root { background:#ffffff; overflow-x:hidden; color:#1a1a1a; }
        .lp-root *, .lp-root *::before, .lp-root *::after { box-sizing:border-box; }

        /* responsive zoom (same as the rest of the system) */
        .lp-zoom { zoom:0.75; }
        @media (min-width:1600px) { .lp-zoom { zoom:0.9; } }
        @media (min-width:1920px) { .lp-zoom { zoom:1; } }
        @media (max-width:768px)  { .lp-zoom { zoom:1; } }

        @keyframes lpFloat     { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes lpFloatSlow { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        @keyframes lpBounce    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes lpDrop      { from{opacity:0;transform:translateY(-30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes lpScan      { 0%{top:-2px} 100%{top:102%} }
        @keyframes lpPulse     { 0%{box-shadow:0 0 0 0 rgba(16,185,129,0.5)} 70%{box-shadow:0 0 0 6px rgba(16,185,129,0)} 100%{box-shadow:0 0 0 0 rgba(16,185,129,0)} }

        .lp-reveal { opacity:0; transform:translateY(32px); transition:opacity 0.7s ease, transform 0.7s ease; }
        .lp-reveal.visible { opacity:1; transform:translateY(0); }
        .lp-d1{transition-delay:0.05s} .lp-d2{transition-delay:0.12s} .lp-d3{transition-delay:0.19s}
        .lp-d4{transition-delay:0.26s} .lp-d5{transition-delay:0.33s} .lp-d6{transition-delay:0.40s}

        /* section text */
        .lp-eyebrow { display:inline-flex; align-items:center; gap:0.45rem; font-size:0.72rem; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#d39e00; margin-bottom:0.75rem; }
        .lp-heading { font-size:2.5rem; font-weight:800; line-height:1.2; color:#111827; margin-bottom:1rem; }
        .lp-heading em { font-style:normal; color:#ffc107; }
        .lp-sub { font-size:1.15rem; color:#6b7280; line-height:1.65; max-width:580px; }
        .lp-section { padding:6rem 0; }

        /* buttons */
        .lp-btn { display:inline-flex; align-items:center; justify-content:center; gap:0.6rem; border-radius:14px; padding:0.9rem 2rem; font-weight:700; font-size:1rem; cursor:pointer; transition:all 0.25s; border:2px solid transparent; text-decoration:none; }
        .lp-btn-primary { background:#ffc107; color:#1a1a1a; }
        .lp-btn-primary:hover { background:#e6ac00; transform:translateY(-2px); box-shadow:0 12px 28px rgba(255,193,7,0.35); }
        .lp-btn-outline { background:transparent; color:#1a1a1a; border-color:#1a1a1a; }
        .lp-btn-outline:hover { background:#1a1a1a; color:#ffc107; transform:translateY(-2px); }
        .lp-btn-ghost { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.85); border-color:rgba(255,255,255,0.18); }
        .lp-btn-ghost:hover { background:rgba(255,255,255,0.14); color:#fff; transform:translateY(-2px); }
        .lp-btn:focus-visible { outline:3px solid rgba(255,193,7,0.6); outline-offset:2px; }

        /* hero */
        .lp-hero { background:linear-gradient(135deg,#ffffff 0%,#f8f9fa 100%); min-height:100vh; display:flex; align-items:center; position:relative; overflow:hidden; padding:3rem 0; }
        .lp-blob { position:absolute; width:384px; height:384px; border-radius:50%; filter:blur(80px); pointer-events:none; }
        .lp-dot { position:absolute; border-radius:50%; background:#ffc107; opacity:0.5; pointer-events:none; }
        .lp-hero-logo { max-width:170px; height:auto; margin-bottom:1.25rem; filter:drop-shadow(0 0 20px rgba(255,193,7,0.3)); animation:lpDrop 0.8s ease-out, lpBounce 2.5s ease-in-out 0.8s infinite; }
        .lp-hero-title { font-size:3.5rem; font-weight:800; line-height:1.15; margin-bottom:1.25rem; animation:lpDrop 0.8s ease-out 0.15s backwards; }
        .lp-hero-sub { font-size:1.25rem; color:#555; line-height:1.65; margin-bottom:2rem; animation:lpDrop 0.8s ease-out 0.3s backwards; }
        .lp-hero-btns { display:flex; gap:0.85rem; flex-wrap:wrap; justify-content:center; animation:lpDrop 0.8s ease-out 0.45s backwards; }
        .lp-hero-chips { display:flex; gap:0.5rem; flex-wrap:wrap; justify-content:center; margin-top:1.75rem; animation:lpDrop 0.8s ease-out 0.6s backwards; }
        .lp-chip { display:inline-flex; align-items:center; gap:0.4rem; font-size:0.82rem; font-weight:600; color:#4b5563; background:#fff; border:1px solid #eceef1; padding:0.4rem 0.85rem; border-radius:999px; }
        .lp-chip i { color:#d39e00; }
        .lp-hero-art { position:relative; display:flex; align-items:center; justify-content:center; animation:lpDrop 0.8s ease-out 0.35s backwards; }
        .lp-hero-glow { position:absolute; width:130%; height:130%; background:radial-gradient(ellipse 80% 70% at 50% 55%, rgba(255,193,7,0.25) 0%, rgba(255,193,7,0.1) 45%, transparent 75%); filter:blur(18px); z-index:0; }
        .lp-hero-img { position:relative; z-index:1; width:120%; max-width:680px; height:auto; object-fit:contain; filter:drop-shadow(0 20px 40px rgba(255,193,7,0.2)) drop-shadow(0 8px 16px rgba(0,0,0,0.08)); animation:lpFloat 4s ease-in-out infinite; }
        .lp-scroll-cue { position:absolute; left:50%; bottom:1.5rem; transform:translateX(-50%); background:none; border:none; color:#9ca3af; font-size:0.78rem; font-weight:600; display:flex; flex-direction:column; align-items:center; gap:0.3rem; cursor:pointer; z-index:10; }
        .lp-scroll-cue i { animation:lpFloatSlow 1.8s ease-in-out infinite; }

        /* cards */
        .lp-card { background:#fff; border-radius:18px; padding:1.75rem; border:1px solid #f0f1f3; box-shadow:0 4px 10px rgba(0,0,0,0.04); position:relative; overflow:hidden; height:100%; transition:transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease; }
        .lp-card:hover { transform:translateY(-6px); box-shadow:0 18px 40px rgba(0,0,0,0.09); border-color:#e5e7eb; }
        .lp-card-bar { position:absolute; top:0; left:0; right:0; height:3px; opacity:0; transition:opacity 0.3s; }
        .lp-card:hover .lp-card-bar { opacity:1; }
        .lp-icon { width:64px; height:64px; border-radius:16px; display:flex; align-items:center; justify-content:center; margin-bottom:1.25rem; transition:transform 0.3s; flex-shrink:0; }
        .lp-card:hover .lp-icon { transform:scale(1.08) rotate(-4deg); }
        .lp-card h3 { font-size:1.2rem; font-weight:700; color:#111827; margin-bottom:0.6rem; }
        .lp-card p { color:#6b7280; line-height:1.6; margin:0; font-size:0.97rem; }
        .lp-tag { display:inline-block; background:rgba(255,193,7,0.14); color:#a16207; padding:2px 10px; border-radius:100px; font-size:0.66rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px; }
        .lp-feat-head { display:flex; align-items:center; gap:0.9rem; margin-bottom:1rem; }
        .lp-feat-head .lp-icon { width:54px; height:54px; margin:0; background:#fef3c7; }
        .lp-feat-head h3 { margin:0; }

        /* steps */
        .lp-steps { display:grid; grid-template-columns:repeat(3,1fr); gap:1.25rem; position:relative; }
        .lp-step { text-align:center; padding:1.5rem 1rem; position:relative; }
        .lp-step-num { width:56px; height:56px; border-radius:50%; background:#1a1a1a; color:#ffc107; display:flex; align-items:center; justify-content:center; margin:0 auto 1rem; font-size:1.2rem; position:relative; z-index:1; box-shadow:0 0 0 6px #f9fafb; }
        .lp-step-num span { position:absolute; top:-4px; right:-4px; width:22px; height:22px; border-radius:50%; background:#ffc107; color:#1a1a1a; font-size:0.72rem; font-weight:800; display:flex; align-items:center; justify-content:center; }
        .lp-step h4 { font-size:1.08rem; font-weight:700; color:#111827; margin-bottom:0.35rem; }
        .lp-step p { font-size:0.93rem; color:#6b7280; margin:0; line-height:1.55; }
        .lp-steps::before { content:''; position:absolute; top:calc(1.5rem + 28px); left:16.66%; right:16.66%; border-top:2px dashed #e5e7eb; }

        /* map */
        .lp-map-item { display:flex; gap:1rem; align-items:flex-start; padding:1rem 1.15rem; border-radius:14px; border:1.5px solid #f0f0f0; background:#fff; transition:all 0.25s; }
        .lp-map-item:hover { border-color:rgba(255,193,7,0.45); box-shadow:0 6px 24px rgba(0,0,0,0.06); transform:translateX(4px); }
        .lp-map-item-ic { width:42px; height:42px; border-radius:12px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .lp-map-item strong { display:block; font-size:1rem; color:#111827; margin-bottom:2px; }
        .lp-map-item span { font-size:0.9rem; color:#6b7280; line-height:1.55; }
        .lp-map-card { background:#fff; border-radius:20px; overflow:hidden; box-shadow:0 24px 64px rgba(0,0,0,0.10), 0 4px 16px rgba(0,0,0,0.06); }
        .lp-map-head { background:linear-gradient(135deg,#1a1a1a,#2d2d2d); padding:0.95rem 1.4rem; display:flex; align-items:center; justify-content:space-between; gap:0.75rem; }
        .lp-map-head-title { display:flex; align-items:center; gap:0.6rem; color:#fff; font-weight:700; font-size:0.9rem; min-width:0; }
        .lp-map-head-title span { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .lp-map-body { position:relative; overflow:hidden; background:#0d1424; }
        .lp-map-el { height:420px; width:100%; }
        .lp-map-scan { position:absolute; left:0; right:0; height:2px; background:linear-gradient(90deg,transparent,rgba(255,193,7,0.6),transparent); animation:lpScan 4s linear infinite; pointer-events:none; z-index:5; }
        .lp-map-legend { position:absolute; top:12px; right:12px; z-index:6; background:rgba(255,255,255,0.95); border-radius:12px; padding:0.65rem 0.9rem; box-shadow:0 4px 16px rgba(0,0,0,0.12); }
        .lp-map-legend div { display:flex; align-items:center; gap:0.5rem; }
        .lp-map-legend div + div { margin-top:0.35rem; }
        .lp-map-legend i.sw { width:16px; height:16px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:8px; font-style:normal; flex-shrink:0; color:#fff; }
        .lp-map-legend span { font-size:0.68rem; font-weight:600; color:#444; }
        .lp-map-note { position:absolute; left:12px; bottom:12px; z-index:6; background:rgba(255,255,255,0.95); border-radius:10px; padding:0.45rem 0.8rem; font-size:0.75rem; font-weight:600; color:#065f46; display:flex; align-items:center; gap:0.45rem; box-shadow:0 4px 14px rgba(0,0,0,0.12); }
        .lp-map-msg { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.6rem; color:#a9b4cc; font-size:0.9rem; z-index:4; text-align:center; padding:1rem; }
        .lp-map-foot { padding:0.75rem 1.25rem; border-top:1px solid #f0f0f0; display:flex; align-items:center; justify-content:space-between; gap:0.75rem; flex-wrap:wrap; }
        .lp-map-stats { display:flex; align-items:center; gap:0.9rem; flex-wrap:wrap; font-size:0.75rem; color:#6b7280; font-weight:600; }
        .lp-live { width:7px; height:7px; border-radius:50%; background:#10b981; display:inline-block; margin-right:0.35rem; animation:lpPulse 2s infinite; }
        .lp-map-btn { background:#1a1a1a; color:#ffc107; border:none; border-radius:8px; padding:0.45rem 0.95rem; font-size:0.75rem; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:0.4rem; transition:background 0.2s; }
        .lp-map-btn:hover { background:#333; }

        /* CTA */
        .lp-cta { padding:5rem 0; background:#1a1a1a; position:relative; overflow:hidden; }
        .lp-cta h2 { font-size:2.6rem; font-weight:800; color:#fff; margin-bottom:1rem; }
        .lp-cta p { font-size:1.15rem; color:rgba(255,255,255,0.6); max-width:540px; margin:0 auto 2.25rem; line-height:1.65; }
        .lp-cta-btns { display:flex; gap:1rem; justify-content:center; flex-wrap:wrap; }

        .lp-glow { position:fixed; width:320px; height:320px; border-radius:50%; pointer-events:none; z-index:9999; background:radial-gradient(circle, rgba(255,193,7,0.10) 0%, transparent 70%); transition:transform 0.4s ease; left:0; top:0; }

        /* ── tablet ── */
        @media (max-width:991.98px) {
          .lp-hero { min-height:auto; padding:4rem 0 4.5rem; }
          .lp-hero-art { margin-top:2.5rem; }
          .lp-hero-img { width:100%; max-width:520px; }
          .lp-scroll-cue { display:none; }
          .lp-map-copy { margin-bottom:0.5rem; }
        }

        /* ── mobile ── */
        @media (max-width:768px) {
          .lp-section { padding:3.5rem 0; }
          .lp-hero { padding:2.5rem 0 3rem; }
          .lp-hero-logo { max-width:110px; margin-bottom:1rem; }
          .lp-hero-title { font-size:2rem; text-align:center; }
          .lp-hero-sub { font-size:1rem; text-align:center; margin-bottom:1.5rem; }
          .lp-hero-btns { flex-direction:column; align-items:stretch; }
          .lp-hero-btns .lp-btn { width:100%; padding:0.85rem 1rem; }
          .lp-hero-chips { margin-top:1.25rem; }
          .lp-chip { font-size:0.75rem; padding:0.35rem 0.7rem; }
          .lp-hero-art { margin-top:2rem; }
          .lp-hero-img { animation:none; }
          .lp-blob { width:240px; height:240px; filter:blur(60px); }
          .lp-heading { font-size:1.7rem; }
          .lp-sub { font-size:0.98rem; }
          .lp-eyebrow { font-size:0.66rem; }
          .lp-card { padding:1.35rem; border-radius:16px; }
          .lp-card:hover { transform:none; }
          .lp-icon { width:54px; height:54px; margin-bottom:1rem; }
          .lp-card h3 { font-size:1.08rem; }
          .lp-card p { font-size:0.92rem; }
          .lp-steps { grid-template-columns:1fr; gap:0.25rem; }
          .lp-steps::before { display:none; }
          .lp-step { display:flex; align-items:center; text-align:left; gap:1rem; padding:0.85rem 0.25rem; }
          .lp-step-num { margin:0; flex-shrink:0; width:50px; height:50px; font-size:1.05rem; }
          .lp-map-item { padding:0.8rem 0.9rem; }
          .lp-map-item:hover { transform:none; }
          .lp-map-item span { font-size:0.85rem; }
          .lp-map-el { height:300px; }
          .lp-map-card { border-radius:16px; }
          .lp-map-head { padding:0.8rem 1rem; }
          .lp-map-head .lp-dots { display:none; }
          .lp-map-legend { top:8px; right:8px; padding:0.5rem 0.65rem; }
          .lp-map-legend span { font-size:0.62rem; }
          .lp-map-foot { padding:0.7rem 1rem; }
          .lp-map-btn { width:100%; justify-content:center; padding:0.6rem; font-size:0.8rem; }
          .lp-cta { padding:3.5rem 0; }
          .lp-cta h2 { font-size:1.7rem; }
          .lp-cta p { font-size:0.98rem; margin-bottom:1.75rem; }
          .lp-cta-btns { flex-direction:column; align-items:stretch; }
          .lp-cta-btns .lp-btn { width:100%; }
        }

        @media (prefers-reduced-motion: reduce) {
          .lp-root *, .lp-root *::before, .lp-root *::after { animation:none !important; transition:none !important; }
          .lp-reveal { opacity:1; transform:none; }
        }
      `}</style>

      {/* soft cursor glow (desktop only) */}
      {canHover && (
        <div className="lp-glow" style={{ transform:`translate(${mousePosition.x - 160}px, ${mousePosition.y - 160}px)` }} />
      )}

      {/* ════ HERO ════ */}
      <section id="home" className="lp-hero">
        <div className="lp-blob" style={{ background:'#f59e0b', opacity:0.15, top:'10%', right:'10%', transform:`translateY(${scrollY*0.3}px)` }} />
        <div className="lp-blob" style={{ background:'#3b82f6', opacity:0.1, bottom:'10%', left:'10%', transform:`translateY(${-scrollY*0.2}px)` }} />
        {[{top:'20%',left:'5%',size:8,delay:'0s'},{top:'70%',left:'8%',size:5,delay:'0.8s'},{top:'40%',right:'5%',size:6,delay:'1.2s'},{top:'80%',right:'12%',size:10,delay:'0.4s'}].map((d,i)=>(
          <div key={i} className="lp-dot" style={{ width:d.size, height:d.size, top:d.top, left:d.left, right:d.right, animation:`lpFloatSlow 4s ease-in-out ${d.delay} infinite` }} />
        ))}

        <Container className="lp-zoom" style={{ position:'relative', zIndex:10 }}>
          <Row className="align-items-center">
            <Col lg={6}>
              <div className="text-center text-lg-start">
                <img src="/logo.png" alt="PetUnity Logo" className="lp-hero-logo" />
              </div>
              <h1 className="lp-hero-title text-center text-lg-start">
                Welcome to <span style={{ color:'#ffc107' }}>Pet</span><span style={{ color:'#1a1a1a' }}>Unity</span>
              </h1>
              <p className="lp-hero-sub text-center text-lg-start">
                Managing pet health and vaccination records across Muntinlupa City. Keep your pets healthy and compliant with ease.
              </p>
              <div className="lp-hero-btns justify-content-lg-start">
                <button className="lp-btn lp-btn-primary" onClick={() => navigate('/register')}>
                  <i className="fas fa-user-plus" /> Create Account
                </button>
                <button className="lp-btn lp-btn-outline" onClick={() => navigate('/login')}>
                  <i className="fas fa-sign-in-alt" /> Sign In
                </button>
              </div>
              <div className="lp-hero-chips justify-content-lg-start">
                <span className="lp-chip"><i className="fas fa-syringe" /> Vaccination records</span>
                <span className="lp-chip"><i className="fas fa-qrcode" /> Pet QR code</span>
                <span className="lp-chip"><i className="fas fa-map-marked-alt" /> Rabies map</span>
              </div>
            </Col>
            <Col lg={6}>
              <div className="lp-hero-art">
                <div className="lp-hero-glow" />
                <img src="/ads1.png" alt="PetUnity preview" className="lp-hero-img" />
              </div>
            </Col>
          </Row>
        </Container>

        <button type="button" className="lp-scroll-cue" onClick={() => goToSection('about')} aria-label="Scroll to services">
          Explore <i className="fas fa-chevron-down" />
        </button>
      </section>

      {/* ════ SERVICES ════ */}
      <section id="about" className="lp-section" style={{ background:'#ffffff' }}>
        <Container className="lp-zoom">
          <div ref={servicesRef} className={`text-center mb-5 lp-reveal ${servicesVisible?'visible':''}`}>
            <span className="lp-eyebrow">What We Offer</span>
            <h2 className="lp-heading">Veterinary Services</h2>
            <p className="lp-sub mx-auto">Programs offered by the City Veterinary Office that you can register for through PetUnity.</p>
          </div>
          <Row className="g-3 g-md-4">
            {SERVICES.map((s, i) => (
              <Col key={s.label} xs={12} sm={6} lg={3}>
                <div className={`lp-card lp-reveal lp-d${i+1} ${servicesVisible?'visible':''}`}>
                  <div className="lp-card-bar" style={{ background:s.color }} />
                  <div className="lp-icon" style={{ background:`${s.color}1f` }}>
                    <IconImage src={s.image} icon={s.icon} color={s.color} size={64} />
                  </div>
                  <h3>{s.label}</h3>
                  <p>{s.description}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ════ HOW IT WORKS ════ */}
      <section id="how" className="lp-section" style={{ background:'#f9fafb' }}>
        <Container className="lp-zoom">
          <div ref={stepsRef} className={`text-center mb-4 mb-md-5 lp-reveal ${stepsVisible?'visible':''}`}>
            <span className="lp-eyebrow">Getting Started</span>
            <h2 className="lp-heading">How It Works</h2>
            <p className="lp-sub mx-auto">Three simple steps to start managing your pet's health.</p>
          </div>
          <div className="lp-steps">
            {STEPS.map((s, i) => (
              <div key={s.title} className={`lp-step lp-reveal lp-d${i+1} ${stepsVisible?'visible':''}`}>
                <div className="lp-step-num"><i className={`fas ${s.icon}`} /><span>{i + 1}</span></div>
                <div>
                  <h4>{s.title}</h4>
                  <p>{s.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ════ MAP ════ */}
      <section id="map-feature" className="lp-section" style={{ background:'#ffffff' }}>
        <Container className="lp-zoom">
          <Row className="align-items-center g-4 g-lg-5">
            <Col lg={5}>
              <div ref={mapSectionRef} className={`lp-map-copy lp-reveal ${mapSectionVisible?'visible':''}`}>
                <span className="lp-eyebrow"><i className="fas fa-map-marked-alt" />Rabies Activity Map</span>
                <h2 className="lp-heading">Know What's Happening <em>Near You</em></h2>
                <p className="lp-sub" style={{ marginBottom:'1.75rem' }}>
                  See reported rabies cases, alert zones, and the nearest veterinary services in Muntinlupa City, all in one map.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.7rem' }}>
                  {MAP_FEATURES.map((f, i) => (
                    <div key={f.title} className={`lp-map-item lp-reveal lp-d${i+1} ${mapSectionVisible?'visible':''}`}>
                      <div className="lp-map-item-ic" style={{ background:`${f.color}18` }}>
                        <i className={`fas ${f.icon}`} style={{ color:f.color }} />
                      </div>
                      <div>
                        <strong>{f.title}</strong>
                        <span>{f.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Col>

            <Col lg={7}>
              <div className={`lp-reveal lp-d2 ${mapSectionVisible?'visible':''}`}>
                <div className="lp-map-card">
                  <div className="lp-map-head">
                    <div className="lp-map-head-title">
                      <i className="fas fa-map" style={{ color:'#ffc107' }} />
                      <span>Rabies Activity Map — Muntinlupa City</span>
                    </div>
                    <div className="lp-dots" style={{ display:'flex', gap:'0.45rem' }}>
                      {['#ff5f57','#febc2e','#28c840'].map(c => (
                        <div key={c} style={{ width:10, height:10, borderRadius:'50%', background:c }} />
                      ))}
                    </div>
                  </div>

                  <div className="lp-map-body">
                    <div ref={mapElRef} className="lp-map-el" />

                    {!mapReady && (
                      <div className="lp-map-msg">
                        {mapError ? (
                          <><i className="fas fa-map-marked-alt" style={{ fontSize:'1.6rem' }} />The map could not be loaded. Please check your connection.</>
                        ) : (
                          <><div className="spinner-border spinner-border-sm" role="status" />Loading map…</>
                        )}
                      </div>
                    )}

                    {mapReady && <div className="lp-map-scan" />}

                    <div className="lp-map-legend">
                      {[
                        { color:'#e00000', label:'Positive Rabies' },
                        { color:'#f0c800', label:'Suspected Rabies' },
                        { color:'#ffc107', label:'City Vet' },
                        { color:'#0d6efd', label:'Private Clinic' },
                      ].map(l => (
                        <div key={l.label}>
                          <i className="sw" style={{ background:l.color, border:'2px solid #fff', boxShadow:'0 0 0 1px rgba(0,0,0,0.08)' }} />
                          <span>{l.label}</span>
                        </div>
                      ))}
                    </div>

                    {mapReady && dataLoaded && mapReports.length === 0 && (
                      <div className="lp-map-note">
                        <i className="fas fa-check-circle" style={{ color:'#10b981' }} />
                        No active rabies cases reported
                      </div>
                    )}
                  </div>

                  <div className="lp-map-foot">
                    <div className="lp-map-stats">
                      <span><span className="lp-live" />Live data</span>
                      {dataLoaded && (
                        <>
                          <span style={{ color:'#e00000' }}>{positiveCount} positive</span>
                          <span style={{ color:'#b38f00' }}>{suspectedCount} suspected</span>
                          <span style={{ color:'#0d6efd' }}>{mapClinics.length + 1} vet location{mapClinics.length + 1 !== 1 ? 's' : ''}</span>
                        </>
                      )}
                    </div>
                    <button className="lp-map-btn" onClick={() => navigate('/owner/map-status')}>
                      <i className="fas fa-expand-alt" /> Open Full Map
                    </button>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ════ FEATURES ════ */}
      <section id="features" className="lp-section" style={{ background:'#f9fafb' }}>
        <Container className="lp-zoom">
          <div ref={featuresRef} className={`text-center mb-5 lp-reveal ${featuresVisible?'visible':''}`}>
            <span className="lp-eyebrow">Platform Features</span>
            <h2 className="lp-heading">Why Choose PetUnity?</h2>
            <p className="lp-sub mx-auto">Everything you need to manage your pet's health in one place.</p>
          </div>
          <Row className="g-3 g-md-4">
            {FEATURES.map((f, i) => (
              <Col key={f.title} xs={12} md={6} lg={4}>
                <div className={`lp-card lp-reveal lp-d${i+1} ${featuresVisible?'visible':''}`}>
                  <div className="lp-feat-head">
                    <div className="lp-icon">
                      <i className={`fas ${f.icon}`} style={{ fontSize:'1.35rem', color:'#d97706' }} />
                    </div>
                    <div>
                      <span className="lp-tag">{f.label}</span>
                      <h3>{f.title}</h3>
                    </div>
                  </div>
                  <p>{f.description}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ════ CTA ════ */}
      <section className="lp-cta">
        <div className="lp-blob" style={{ width:400, height:400, background:'#ffc107', opacity:0.06, top:'-20%', right:'-5%' }} />
        <div className="lp-blob" style={{ width:300, height:300, background:'#3b82f6', opacity:0.05, bottom:'-20%', left:'-5%' }} />
        <Container className="lp-zoom" style={{ textAlign:'center', position:'relative', zIndex:1 }}>
          <span className="lp-eyebrow" style={{ color:'#ffc107' }}>Get Started Today</span>
          <h2>Keep Your Pets Safe with PetUnity</h2>
          <p>Register your pets, keep their health records in one place, and stay informed about rabies activity in Muntinlupa City.</p>
          <div className="lp-cta-btns">
            <button className="lp-btn lp-btn-primary" onClick={() => navigate('/register')}>
              <i className="fas fa-user-plus" /> Create Account
            </button>
            <button className="lp-btn lp-btn-ghost" onClick={() => navigate('/login')}>
              <i className="fas fa-sign-in-alt" /> Sign In
            </button>
          </div>
        </Container>
      </section>
    </div>
  );
};

export default LandingPage;