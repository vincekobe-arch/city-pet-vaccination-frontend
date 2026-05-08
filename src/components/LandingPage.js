import React, { useState, useEffect, useRef } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { reportsAPI, clinicAPI } from '../services/api';

/* ─── Scroll-reveal hook ─── */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
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
  [14.4700,121.0200],[14.4650,121.0500],[14.4550,121.0700],[14.4400,121.0800],
  [14.4200,121.0750],[14.4000,121.0700],[14.3800,121.0600],[14.3600,121.0450],
  [14.3550,121.0250],[14.3650,121.0050],[14.3850,120.9980],[14.4050,120.9950],
  [14.4300,121.0000],[14.4550,121.0050],[14.4700,121.0200],
];

const getDistMeters = (lat1,lng1,lat2,lng2) => {
  const R=6371000, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [scrollY,        setScrollY]        = useState(0);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [hoveredService, setHoveredService] = useState(null);
  const [mousePosition,  setMousePosition]  = useState({ x: 0, y: 0 });

  const [servicesRef, servicesVisible] = useReveal();
  const [featuresRef, featuresVisible] = useReveal();
  const [mapSectionRef, mapSectionVisible] = useReveal();

  /* Leaflet */
  const leafletMapRef      = useRef(null);
  const leafletInstanceRef = useRef(null);
  const markersRef         = useRef([]);
  const circlesRef         = useRef([]);
  const clinicMarkersRef   = useRef([]);
  const [leafletLoaded,    setLeafletLoaded] = useState(false);
  const [mapReports,       setMapReports]    = useState([]);
  const [mapClinics,       setMapClinics]    = useState([]);

  /* scroll */
  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  /* mouse */
  useEffect(() => {
    const h = (e) => setMousePosition({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);

  /* load Leaflet CSS + JS */
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

  /* fetch real data */
  useEffect(() => {
    const load = async () => {
      try {
        const [rRes, cRes] = await Promise.all([reportsAPI.getMapReports(), clinicAPI.getAll()]);
        const rabies = (rRes.data.reports || []).filter(r =>
          (r.status === 'positive_rabies' || r.status === 'suspected_rabies') && r.status !== 'resolved'
        );
        const clinics = (cRes.data.clinics || []).filter(c => c.is_active == 1 && c.latitude && c.longitude);
        setMapReports(rabies);
        setMapClinics(clinics);
      } catch (e) { /* silent — map still loads tiles */ }
    };
    load();
  }, []);

  /* init map — bounds locked to Muntinlupa */
useEffect(() => {
  if (!leafletLoaded || !leafletMapRef.current || leafletInstanceRef.current) return;

  const initMap = () => {
    if (!leafletMapRef.current) return;
    const el = leafletMapRef.current;
    if (!el.offsetWidth || !el.offsetHeight) {
      setTimeout(initMap, 150);
      return;
    }

    const L = window.L;
    const map = L.map(el, {
      center: MUNTI_CENTER,
      zoom: 13,
      minZoom: 12,
      maxZoom: 22,
      maxBounds: MUNTI_BOUNDS,
      maxBoundsViscosity: 1.0,
      zoomControl: true,
      scrollWheelZoom: false,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 22, maxNativeZoom: 19,
    }).addTo(map);
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .leaflet-control-attribution{background:rgba(0,0,0,0.45)!important;color:#aaa!important;font-size:0.62rem!important;padding:2px 6px!important;border-radius:4px 0 0 0!important}
      .leaflet-control-attribution a{color:#ccc!important}
      .custom-report-icon{background:none!important;border:none!important}
      .radius-label{background:transparent!important;border:none!important;box-shadow:none!important}
      .leaflet-popup-content-wrapper{border-radius:16px!important;box-shadow:0 8px 32px rgba(0,0,0,0.18)!important;border:none!important;padding:0!important;overflow:hidden}
      .leaflet-popup-content{margin:0!important}
      .leaflet-popup-tip-container{display:none}
    `;
    document.head.appendChild(styleEl);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.polygon(BOUNDARY, { color:'#ffc107', weight:2.5, opacity:0.8, fillColor:'#ffc107', fillOpacity:0, dashArray:'6,4' }).addTo(map);
    leafletInstanceRef.current = map;

    setTimeout(() => map.invalidateSize(), 200);
  };

  initMap();

}, [leafletLoaded]);

  /* render report markers + danger circles — identical to OwnerMapStatus */
  useEffect(() => {
    if (!leafletInstanceRef.current || !leafletLoaded) return;
    const L   = window.L;
    const map = leafletInstanceRef.current;

    markersRef.current.forEach(m => map.removeLayer(m));
    circlesRef.current.forEach(c => map.removeLayer(c));
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
  const isPos = o.status==='positive_rabies';
  try {
    const circle = L.circle([o.lat,o.lng], {
      radius: 1000,
      color: isPos?'#e00000':'#f0c800', weight:2.5, opacity:0.85,
      fillColor: isPos?'#e00000':'#f0c800',
      fillOpacity: isPos?0.12:0.10,
      dashArray: isPos?null:'6,4',
    }).addTo(map);
    const lIcon = L.divIcon({
      className: 'radius-label',
      html: `<div style="background:${isPos?'rgba(220,0,0,0.85)':'rgba(220,180,0,0.9)'};color:#fff;padding:3px 8px;border-radius:10px;font-size:0.7rem;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.25);">1 km ${isPos?'⚠️ Danger Zone':'🔍 Alert Zone'}</div>`,
      iconAnchor:[40,10],
    });
    const lm = L.marker([o.lat+0.0085,o.lng],{icon:lIcon,interactive:false}).addTo(map);
    circlesRef.current.push(circle,lm);
  } catch(e) {
    console.warn('Circle render skipped:', e.message);
  }
});

    sorted.forEach(r => {
      const lat=parseFloat(r.latitude), lng=parseFloat(r.longitude);
      if (isNaN(lat)||isNaN(lng)) return;
      const isPos   = r.status==='positive_rabies';
      const color   = isPos?'#e00000':'#f0c800';
      const emoji   = isPos?'☣️':'⚠️';
      const label   = isPos?'Positive Rabies':'Suspected Rabies';
      const bgColor = isPos?'rgba(224,0,0,0.9)':'rgba(220,180,0,0.95)';
      const txtColor= isPos?'#fff':'#1a1a1a';

      const icon = L.divIcon({
        className:'custom-report-icon',
        html:`<div style="position:relative;width:28px;height:36px;display:flex;flex-direction:column;align-items:center;">
          <div style="width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2px solid white;box-shadow:0 3px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;overflow:hidden;">
            <div style="transform:rotate(45deg);font-size:12px;">${emoji}</div>
          </div>
          <div style="width:3px;height:8px;background:rgba(0,0,0,0.25);border-radius:0 0 3px 3px;margin-top:-1px;"></div>
        </div>`,
        iconSize:[28,36],iconAnchor:[14,36],popupAnchor:[0,-38],
      });

      const popup=`<div style="width:200px;font-family:'Segoe UI',sans-serif;overflow:hidden;">
        <div style="background:${bgColor};padding:0.65rem 0.85rem;">
          <div style="font-size:1.2rem;margin-bottom:0.3rem;">${emoji}</div>
          <div style="color:${txtColor};font-weight:700;font-size:0.78rem;">${label}</div>
          <div style="color:${isPos?'rgba(255,255,255,0.65)':'rgba(0,0,0,0.5)'};font-size:0.62rem;margin-top:2px;">
            Reported ${new Date(r.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})}
          </div>
        </div>
        <div style="padding:0.65rem 0.85rem;background:#fff;">
          <div style="margin-bottom:0.4rem;">
            <div style="font-size:0.58rem;color:#aaa;text-transform:uppercase;font-weight:700;letter-spacing:0.4px;">Barangay</div>
            <div style="font-size:0.75rem;color:#222;font-weight:600;margin-top:2px;">${r.barangay_name||'Not specified'}</div>
          </div>
          <div style="margin-top:0.5rem;padding:0.35rem 0.5rem;background:${isPos?'#ffe6e6':'#fffbe6'};border-radius:6px;border-left:3px solid ${color};font-size:0.65rem;font-weight:700;color:${isPos?'#8b0000':'#7a6000'};">
            ${isPos?'⚠️ Stay alert — danger zone within 1km':'🔍 Alert zone — monitor pets nearby'}
          </div>
        </div>
      </div>`;

      const m = L.marker([lat,lng],{icon,interactive:false}).addTo(map);
      markersRef.current.push(m);
    });
  }, [mapReports, leafletLoaded]);

  /* render clinic markers — identical to OwnerMapStatus */
  useEffect(() => {
    if (!leafletInstanceRef.current || !leafletLoaded) return;
    const L   = window.L;
    const map = leafletInstanceRef.current;

    clinicMarkersRef.current.forEach(m => map.removeLayer(m));
    clinicMarkersRef.current = [];

    const cityVet = {
      id:'cityvet', clinic_name:'City Veterinary Office', clinic_code:'CITYVET-MNL',
      owner_name:'City Veterinarian', phone:null,
      specialization:'Government Veterinary Office',
      latitude:14.395293, longitude:121.044737,
    };

    [cityVet, ...mapClinics].forEach(clinic => {
      const lat=parseFloat(clinic.latitude), lng=parseFloat(clinic.longitude);
      if (isNaN(lat)||isNaN(lng)) return;
      const isCityVet = clinic.id==='cityvet';

      const icon = L.divIcon({
        className:'custom-report-icon',
        html: isCityVet ? `
          <div style="position:relative;width:48px;height:58px;display:flex;flex-direction:column;align-items:center;">
            <div style="position:absolute;top:-6px;left:-6px;width:60px;height:60px;border-radius:50%;border:3px solid rgba(255,193,7,0.5);animation:cityvet-pulse 2s ease-out infinite;"></div>
            <div style="width:44px;height:44px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,#ffc107,#ff8c00);border:3px solid white;box-shadow:0 4px 16px rgba(255,193,7,0.7);display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;z-index:1;">
              <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
                <i class="fas fa-hospital" style="font-size:17px;color:#fff;"></i>
              </div>
            </div>
            <div style="width:4px;height:10px;background:rgba(255,140,0,0.6);border-radius:0 0 4px 4px;margin-top:-1px;position:relative;z-index:1;"></div>
          </div>
          <style>@keyframes cityvet-pulse{0%{transform:scale(0.9);opacity:0.8}70%{transform:scale(1.4);opacity:0}100%{transform:scale(0.9);opacity:0}}</style>` : `
          <div style="position:relative;width:32px;height:40px;display:flex;flex-direction:column;align-items:center;">
            <div style="width:32px;height:32px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:linear-gradient(135deg,#0d6efd,#0a58ca);border:2.5px solid white;box-shadow:0 3px 10px rgba(13,110,253,0.5);display:flex;align-items:center;justify-content:center;overflow:hidden;">
              <div style="transform:rotate(45deg);display:flex;align-items:center;justify-content:center;width:100%;height:100%;">
                <i class="fas fa-hospital" style="font-size:13px;color:#fff;"></i>
              </div>
            </div>
            <div style="width:3px;height:8px;background:rgba(13,110,253,0.4);border-radius:0 0 3px 3px;margin-top:-1px;"></div>
          </div>`,
        iconSize:    isCityVet?[48,58]:[32,40],
        iconAnchor:  isCityVet?[24,58]:[16,40],
        popupAnchor: [0,isCityVet?-60:-42],
      });

      const popup=`<div style="width:210px;font-family:'Segoe UI',sans-serif;overflow:hidden;">
        <div style="background:${isCityVet?'linear-gradient(135deg,#ffc107,#ff8c00)':'linear-gradient(135deg,#0d6efd,#0a58ca)'};padding:0.65rem 0.85rem;">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem;">
            <div style="width:28px;height:28px;background:rgba(255,255,255,0.2);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
              <i class="fas fa-hospital" style="font-size:13px;color:#fff;"></i>
            </div>
            <div>
              <div style="color:${isCityVet?'#1a1a1a':'#fff'};font-weight:700;font-size:0.75rem;line-height:1.2;">${clinic.clinic_name}</div>
              <div style="color:${isCityVet?'rgba(0,0,0,0.5)':'rgba(255,255,255,0.65)'};font-size:0.6rem;">${isCityVet?'Government Veterinary Office':(clinic.clinic_code||'')}</div>
            </div>
          </div>
          <span style="display:inline-block;background:rgba(255,255,255,0.2);color:${isCityVet?'#1a1a1a':'#fff'};padding:1px 8px;border-radius:20px;font-size:0.6rem;font-weight:700;">
            🏥 ${isCityVet?'City Government Clinic':'Private Clinic'}
          </span>
        </div>
        <div style="padding:0.65rem 0.85rem;background:#fff;display:flex;flex-direction:column;gap:0.4rem;">
          ${clinic.owner_name?`<div><div style="font-size:0.58rem;color:#aaa;text-transform:uppercase;font-weight:700;letter-spacing:0.4px;">Veterinarian</div><div style="font-size:0.72rem;color:#222;font-weight:600;margin-top:1px;">${isCityVet?clinic.owner_name:'Dr. '+clinic.owner_name}</div></div>`:''}
          <div style="display:flex;gap:0.35rem;margin-top:0.2rem;">
            ${clinic.phone?`<div style="flex:1;background:#f8f9fa;padding:0.28rem 0.4rem;border-radius:5px;border:1px solid #eee;"><div style="font-size:0.54rem;color:#aaa;font-weight:700;text-transform:uppercase;">Phone</div><div style="font-size:0.65rem;color:#333;font-weight:600;margin-top:1px;">${clinic.phone}</div></div>`:''}
            ${clinic.specialization?`<div style="flex:1;background:#e8f0fe;padding:0.28rem 0.4rem;border-radius:5px;border:1px solid #c5d8fc;"><div style="font-size:0.54rem;color:#5577aa;font-weight:700;text-transform:uppercase;">Specialty</div><div style="font-size:0.62rem;color:#0d6efd;font-weight:700;margin-top:1px;">${clinic.specialization}</div></div>`:''}
          </div>
        </div>
      </div>`;

      const m = L.marker([lat,lng],{icon,interactive:false}).addTo(map);
      clinicMarkersRef.current.push(m);
    });
  }, [mapClinics, leafletLoaded]);

  /* ── static data ── */
  const features = [
    { image:'vaccination_tracking.png', icon:'fa-syringe',          title:'Vaccination Tracking', description:"Keep track of all your pet's vaccinations and get reminders for upcoming shots.",        featureLabel:'Health Monitoring' },
    { image:'event_schedules.png',      icon:'fa-calendar-alt',      title:'Event Schedules',       description:'Register for vaccination drives, seminars, and sterilization services in your barangay.',featureLabel:'Event Management' },
    { image:'digital_vetcards.png',     icon:'fa-id-card',           title:'Digital Vet Cards',     description:"Access your pet's health records anytime, anywhere with digital vet cards.",            featureLabel:'Digital Records' },
    { image:'deworming_records.png',    icon:'fa-pills',             title:'Deworming Records',     description:'Monitor deworming schedules and maintain complete health records for your pets.',       featureLabel:'Treatment Tracking' },
    { image:'barangay_management.png',  icon:'fa-building',          title:'Barangay Management',   description:'Officials can manage pet registrations and organize health services efficiently.',       featureLabel:'Admin Tools' },
    { image:'analytics_reports.png',    icon:'fa-chart-line',        title:'Analytics & Reports',   description:'Track vaccination rates and generate reports for better health management.',            featureLabel:'Data Insights' },
  ];

  const services = [
    { image:'vaccine.png',       icon:'fa-syringe',            label:'Vaccination',   description:'Protect your pet from preventable diseases with regular vaccinations.',      color:'#10b981' },
    { image:'deworm.png',        icon:'fa-pills',              label:'Deworming',     description:'Keep your pet parasite-free with scheduled deworming treatments.',           color:'#f59e0b' },
    { image:'sterilization.png', icon:'fa-cut',                label:'Sterilization', description:'Access affordable spay/neuter services through community programs.',         color:'#8b5cf6' },
    { image:'seminar.png',       icon:'fa-chalkboard-teacher', label:'Seminar',       description:'Learn about responsible pet ownership and proper animal care.',              color:'#3b82f6' },
  ];

  const mapFeatures = [
    { icon:'fa-map-marked-alt', color:'#e00000', title:'Rabies Case Mapping',  desc:'Real-time visualization of confirmed and suspected rabies cases across Muntinlupa City barangays.' },
    { icon:'fa-hospital',       color:'#0d6efd', title:'Nearest Vet Clinics',  desc:'Locate government and private veterinary clinics near you with contact details and specializations.' },
    { icon:'fa-radiation-alt',  color:'#f0c800', title:'Danger Zone Alerts',   desc:'Automatically computed 1km danger and alert zones around active rabies cases to keep your pets safe.' },
    { icon:'fa-shield-alt',     color:'#10b981', title:'Pet Safety Tips',      desc:'Context-aware safety guidance based on your proximity to active cases and outbreak zones.' },
  ];

  return (
    <div style={{ background:'#ffffff', overflowX:'hidden' }}>

      <style>{`
        * { box-sizing: border-box; }

        @media (max-width: 768px) {
          .hero-title { font-size: 2.2rem !important; text-align: center !important; }
          .hero-sub { font-size: 1rem !important; text-align: center !important; }
          .hero-logo { max-width: 120px !important; }
          .hero-img { width: 100% !important; max-width: 100% !important; margin-top: 1.5rem; }
          .hero-btns { flex-direction: column !important; align-items: center !important; }
          .hero-btns button { width: 100% !important; justify-content: center !important; }
          .section-heading { font-size: 1.8rem !important; }
          .section-sub { font-size: 1rem !important; }
          .section-eyebrow { font-size: 0.65rem !important; }
          .map-preview-card { margin: 0 !important; }
          .map-leaflet-div { height: 260px !important; }
          .cta-band-title { font-size: 1.8rem !important; }
          .cta-band-sub { font-size: 1rem !important; }
          .cta-band-btns { flex-direction: column !important; align-items: center !important; }
          .cta-band-btns button { width: 100% !important; justify-content: center !important; }
          .map-feature-item { padding: 0.75rem 0.9rem !important; }
        }

        @keyframes float     { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-12px)} }
        @keyframes floatSlow { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-6px)}  }
        @keyframes bounce    { 0%,100%{transform:translateY(0)}   50%{transform:translateY(-10px)} }
        @keyframes dropDown  { from{opacity:0;transform:translateY(-40px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ping      { 0%{transform:scale(1);opacity:0.8} 80%,100%{transform:scale(2.2);opacity:0} }
        @keyframes scanLine  { 0%{top:-2px} 100%{top:102%} }
        @keyframes borderGlow{ 0%,100%{box-shadow:0 0 0 0 rgba(255,193,7,0)} 50%{box-shadow:0 0 0 6px rgba(255,193,7,0.2)} }

        .reveal-section { opacity:0; transform:translateY(36px); transition:opacity 0.75s ease,transform 0.75s ease; }
        .reveal-section.visible { opacity:1; transform:translateY(0); }
        .stagger-1{transition-delay:0.05s!important} .stagger-2{transition-delay:0.13s!important}
        .stagger-3{transition-delay:0.21s!important} .stagger-4{transition-delay:0.29s!important}
        .stagger-5{transition-delay:0.37s!important} .stagger-6{transition-delay:0.45s!important}

        .map-preview-card {
          background:#fff; border-radius:20px; overflow:hidden;
          box-shadow:0 24px 64px rgba(0,0,0,0.10),0 4px 16px rgba(0,0,0,0.06);
          transition:transform 0.35s ease,box-shadow 0.35s ease;
        }
        .map-preview-card:hover { transform:translateY(-6px); box-shadow:0 36px 80px rgba(0,0,0,0.13),0 6px 20px rgba(0,0,0,0.07); }

        .section-eyebrow { font-size:0.72rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#ffc107;margin-bottom:0.75rem;display:block; }
        .section-heading { font-size:2.5rem;font-weight:800;line-height:1.2;color:#111827;margin-bottom:1rem; }
        .section-sub     { font-size:1.2rem;color:#6b7280;line-height:1.6;max-width:560px; }

        .map-feature-item {
          display:flex;gap:1rem;align-items:flex-start;
          padding:1.1rem 1.25rem;border-radius:14px;
          border:1.5px solid #f0f0f0;background:#fff;
          transition:all 0.25s;cursor:default;
        }
        .map-feature-item:hover { border-color:rgba(255,193,7,0.4);box-shadow:0 6px 24px rgba(0,0,0,0.07);transform:translateX(4px); }

        .cta-btn-primary {
          display:inline-flex;align-items:center;gap:0.6rem;
          background:#ffc107;color:#1a1a1a;border:none;border-radius:14px;
          padding:0.85rem 2rem;font-weight:700;font-size:0.95rem;
          cursor:pointer;transition:all 0.25s;text-decoration:none;
          animation:borderGlow 2.5s infinite;
        }
        .cta-btn-primary:hover { background:#e6ac00;transform:translateY(-2px);box-shadow:0 12px 30px rgba(255,193,7,0.35); }
        .cta-btn-outline {
          display:inline-flex;align-items:center;gap:0.6rem;
          background:transparent;color:#1a1a1a;border:2px solid #1a1a1a;
          border-radius:14px;padding:0.83rem 1.8rem;font-weight:700;
          font-size:0.95rem;cursor:pointer;transition:all 0.25s;
        }
        .cta-btn-outline:hover { background:#1a1a1a;color:#ffc107;transform:translateY(-2px); }
      `}</style>

      {/* Mouse follower */}
      <div style={{
        position:'fixed', width:'320px', height:'320px',
        background:'radial-gradient(circle, rgba(255,193,7,0.12) 0%, transparent 70%)',
        borderRadius:'50%', pointerEvents:'none',
        left:mousePosition.x-160, top:mousePosition.y-160,
        transition:'left 0.4s ease,top 0.4s ease', zIndex:9999
      }} />

      {/* ════ HERO ════ */}
      <section id="home" style={{
        background:'linear-gradient(135deg,#ffffff 0%,#f8f9fa 100%)',
        color:'#1a1a1a', minHeight:'100vh',
        display:'flex', alignItems:'center', position:'relative', overflow:'hidden'
      }}>
        <div style={{ position:'absolute', width:'384px', height:'384px', background:'#f59e0b', borderRadius:'50%', opacity:0.15, filter:'blur(80px)', top:'10%', right:'10%', transform:`translateY(${scrollY*0.3}px)`, transition:'transform 0.1s ease-out' }} />
        <div style={{ position:'absolute', width:'384px', height:'384px', background:'#3b82f6', borderRadius:'50%', opacity:0.1,  filter:'blur(80px)', bottom:'10%', left:'10%',  transform:`translateY(${-scrollY*0.2}px)`, transition:'transform 0.1s ease-out' }} />
        {[{top:'20%',left:'5%',size:8,delay:'0s'},{top:'70%',left:'8%',size:5,delay:'0.8s'},{top:'40%',right:'5%',size:6,delay:'1.2s'},{top:'80%',right:'12%',size:10,delay:'0.4s'}].map((d,i)=>(
          <div key={i} style={{ position:'absolute', width:d.size, height:d.size, borderRadius:'50%', background:'#ffc107', opacity:0.5, top:d.top, left:d.left, right:d.right, animation:`floatSlow 4s ease-in-out ${d.delay} infinite` }} />
        ))}
        <Container style={{ position:'relative', zIndex:10, zoom:'0.75' }}>
          <Row className="align-items-center">
            <Col lg={6}>
              <div className="text-center mb-4">
                <img src="logo.png" alt="PetUnity Logo" className="hero-logo" style={{ maxWidth:'180px', height:'auto', marginBottom:'1.5rem', filter:'drop-shadow(0 0 20px rgba(255,193,7,0.3))', animation:'dropDown 0.8s ease-out, bounce 2s infinite 0.8s' }} />
              </div>
              <h1 className="hero-title" style={{ fontSize:'3.5rem', fontWeight:'800', marginBottom:'1.5rem', lineHeight:'1.2', animation:'dropDown 0.8s ease-out 0.2s backwards' }}>
                Welcome to <span style={{ color:'#ffc107' }}>Pet</span><span style={{ color:'#1a1a1a' }}>Unity</span>
              </h1>
              <p className="hero-sub" style={{ fontSize:'1.3rem', marginBottom:'2rem', color:'#555555', lineHeight:'1.6', animation:'dropDown 0.8s ease-out 0.4s backwards' }}>
                Managing pet health and vaccination records across Muntinlupa City. Keep your pets healthy and compliant with ease.
              </p>
              <div className="d-flex gap-3 mb-4 justify-content-center flex-wrap hero-btns" style={{ animation:'dropDown 0.8s ease-out 0.6s backwards' }}>
                
              </div>
            </Col>
            <Col lg={6}>
              <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', animation:'dropDown 0.8s ease-out 0.4s backwards' }}>
                <div style={{ position:'absolute', width:'140%', height:'140%', background:'radial-gradient(ellipse 80% 70% at 50% 55%, rgba(255,193,7,0.25) 0%, rgba(255,193,7,0.12) 45%, transparent 75%)', filter:'blur(18px)', borderRadius:'60% 40% 55% 45% / 45% 55% 45% 55%', transform:'rotate(-6deg) scale(1.1)', zIndex:0 }} />
                <div style={{ position:'absolute', width:'120%', height:'120%', background:'radial-gradient(ellipse 70% 60% at 55% 50%, rgba(255,193,7,0.18) 0%, transparent 70%)', filter:'blur(24px)', borderRadius:'45% 55% 40% 60% / 55% 45% 60% 40%', transform:'rotate(8deg)', zIndex:0 }} />
                <img src="/ads1.png" alt="PetUnity Ad" className="hero-img" style={{ position:'relative', zIndex:1, width:'130%', maxWidth:'700px', height:'auto', objectFit:'contain', filter:'drop-shadow(0 20px 40px rgba(255,193,7,0.2)) drop-shadow(0 8px 16px rgba(0,0,0,0.08))', animation:'float 4s ease-in-out infinite' }} />
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ════ SERVICES ════ */}
      <section id="about" style={{ padding:'6rem 0', background:'#ffffff', zoom:'0.75' }}>
        <Container>
          <div ref={servicesRef} className={`text-center mb-5 reveal-section ${servicesVisible?'visible':''}`}>
            <span className="section-eyebrow">What We Offer</span>
            <h2 className="section-heading">Our Services</h2>
            <p className="section-sub mx-auto">Comprehensive pet care at your fingertips</p>
          </div>
          <Row>
            {services.map((service, index) => (
              <Col key={index} md={6} lg={3} className="mb-4">
                <div className={`reveal-section stagger-${index+1} ${servicesVisible?'visible':''}`}
                  style={{
                    background:'#fff', borderRadius:'16px', padding:'2rem', cursor:'pointer',
                    transition:'all 0.3s', border:'1px solid #f3f4f6',
                    transform:hoveredService===index?'translateY(-8px)':'translateY(0)',
                    boxShadow:hoveredService===index?'0 20px 40px rgba(0,0,0,0.1)':'0 4px 6px rgba(0,0,0,0.05)',
                    position:'relative', overflow:'hidden'
                  }}
                  onMouseEnter={()=>setHoveredService(index)}
                  onMouseLeave={()=>setHoveredService(null)}
                >
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:service.color, borderRadius:'16px 16px 0 0', opacity:hoveredService===index?1:0, transition:'opacity 0.3s' }} />
                  <div style={{ width:'64px', height:'64px', borderRadius:'16px', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'1.5rem', background:`${service.color}20`, transition:'all 0.3s', transform:hoveredService===index?'scale(1.1) rotate(5deg)':'scale(1) rotate(0deg)' }}>
                    <img src={service.image} alt={service.label} style={{ width:'100px', height:'100px', objectFit:'contain' }}
                      onError={e=>{ e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} />
                    <i className={`fas ${service.icon}`} style={{ fontSize:'2rem', color:service.color, display:'none' }}></i>
                  </div>
                  <h3 style={{ fontSize:'1.25rem', fontWeight:'700', color:'#111827', marginBottom:'0.75rem' }}>{service.label}</h3>
                  <p style={{ color:'#6b7280', lineHeight:'1.6', marginBottom:0 }}>{service.description}</p>
                  <div style={{ position:'absolute', bottom:0, left:0, height:'4px', borderRadius:'50px', background:service.color, width:hoveredService===index?'100%':'0%', transition:'width 0.3s' }} />
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ════ MAP SECTION ════ */}
      <section id="map-feature" style={{ padding:'6rem 0', background:'#f9fafb', zoom:'0.75' }}>
        <Container>
          <Row className="align-items-center g-5">
            {/* Left copy */}
            <Col lg={5}>
              <div ref={mapSectionRef} className={`reveal-section ${mapSectionVisible?'visible':''}`}>
                <span className="section-eyebrow"><i className="fas fa-map-marked-alt me-2"></i>Live Map Intelligence</span>
                <h2 className="section-heading">Know What's Happening <em>Near You</em></h2>
                <p className="section-sub" style={{ marginBottom:'2rem', fontSize:'1.2rem', lineHeight:'1.6' }}>
                  PetUnity's interactive map gives you real-time visibility into rabies activity, danger zones, and the nearest veterinary services — all in one place.
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem' }}>
                  {mapFeatures.map((f, i) => (
                    <div key={i} className={`map-feature-item reveal-section stagger-${i+1} ${mapSectionVisible?'visible':''}`}>
                      <div style={{ width:42, height:42, borderRadius:12, background:`${f.color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <i className={`fas ${f.icon}`} style={{ color:f.color, fontSize:'1rem' }}></i>
                      </div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:'1rem', color:'#111827', marginBottom:2 }}>{f.title}</div>
                        <div style={{ fontSize:'0.9rem', color:'#6b7280', lineHeight:1.6 }}>{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Col>

            {/* Right — real Leaflet map with scanner */}
            <Col lg={7}>
              <div className={`reveal-section stagger-2 ${mapSectionVisible?'visible':''}`}>
                <div className="map-preview-card">
                  {/* Header */}
                  <div style={{ background:'linear-gradient(135deg,#1a1a1a,#2d2d2d)', padding:'1rem 1.5rem', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.6rem' }}>
                      <i className="fas fa-map" style={{ color:'#ffc107' }}></i>
                      <span style={{ color:'#fff', fontWeight:700, fontSize:'0.9rem' }}>Rabies Activity Map — Muntinlupa City</span>
                    </div>
                    <div style={{ display:'flex', gap:'0.5rem' }}>
                      {['#ff5f57','#febc2e','#28c840'].map((c,i)=>(
                        <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:c }} />
                      ))}
                    </div>
                  </div>

                  {/* Map + scanner overlay */}
                  <div style={{ position:'relative', overflow:'hidden' }}>
                    {/* Real Leaflet map */}
                    <div ref={leafletMapRef} className="map-leaflet-div" style={{ height:'400px', width:'100%' }} />

                    {/* Scanner line on top of real map */}
                    <div style={{
                      position:'absolute', left:0, right:0, height:2,
                      background:'linear-gradient(90deg,transparent,rgba(255,193,7,0.6),transparent)',
                      animation:'scanLine 4s linear infinite',
                      pointerEvents:'none', zIndex:998
                    }} />

                    {/* Legend overlay */}
                    <div style={{ position:'absolute', top:12, right:12, zIndex:999, background:'rgba(255,255,255,0.95)', borderRadius:12, padding:'0.7rem 1rem', boxShadow:'0 4px 16px rgba(0,0,0,0.12)' }}>
                      {[
                        { color:'#e00000', emoji:'☣️', label:'Positive Rabies' },
                        { color:'#f0c800', emoji:'⚠️', label:'Suspected Rabies' },
                        { color:'#ffc107', icon:'fa-hospital', label:'City Vet' },
                        { color:'#0d6efd', icon:'fa-hospital', label:'Private Clinic' },
                      ].map((l,i)=>(
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:i<3?'0.35rem':0 }}>
                          <div style={{ width:18, height:18, borderRadius:'50%', background:l.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, flexShrink:0 }}>
                            {l.emoji ? l.emoji : <i className={`fas ${l.icon}`} style={{ color:'#fff', fontSize:7 }}></i>}
                          </div>
                          <span style={{ fontSize:'0.65rem', fontWeight:600, color:'#444' }}>{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ padding:'0.75rem 1.25rem', borderTop:'1px solid #f0f0f0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:'0.72rem', color:'#aaa', fontWeight:500 }}>
                      <i className="fas fa-circle me-1" style={{ color:'#10b981', fontSize:'0.5rem' }}></i>Live Data · Muntinlupa City
                    </span>
                    <button onClick={() => navigate('/owner/map-status')}
                      style={{ background:'#1a1a1a', color:'#ffc107', border:'none', borderRadius:8, padding:'0.35rem 0.9rem', fontSize:'0.72rem', fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                      <i className="fas fa-expand-alt" style={{ fontSize:'0.65rem' }}></i> Full Map
                    </button>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* ════ FEATURES ════ */}
      <section id="features" style={{ padding:'6rem 0', background:'#ffffff', zoom:'0.75' }}>
        <Container>
          <div ref={featuresRef} className={`text-center mb-5 reveal-section ${featuresVisible?'visible':''}`}>
            <span className="section-eyebrow">Platform Features</span>
            <h2 className="section-heading">Why Choose PetUnity?</h2>
            <p className="section-sub mx-auto">Everything you need to manage your pet's health in one place</p>
          </div>
          <Row>
            {features.map((feature, index) => (
              <Col key={index} md={6} lg={4} className="mb-4">
                <div className={`reveal-section stagger-${index+1} ${featuresVisible?'visible':''}`}
                  style={{
                    background:'#fff', borderRadius:'16px', padding:'2rem',
                    transition:'all 0.3s', border:'1px solid #f3f4f6', height:'100%',
                    transform:hoveredFeature===index?'translateY(-8px)':'translateY(0)',
                    boxShadow:hoveredFeature===index?'0 20px 40px rgba(0,0,0,0.1)':'0 4px 6px rgba(0,0,0,0.05)',
                    position:'relative', overflow:'hidden'
                  }}
                  onMouseEnter={()=>setHoveredFeature(index)}
                  onMouseLeave={()=>setHoveredFeature(null)}
                >
                  {hoveredFeature===index && (
                    <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at top left, rgba(255,193,7,0.06), transparent 60%)', pointerEvents:'none' }} />
                  )}
                  <div style={{ display:'flex', alignItems:'flex-start', gap:'0.75rem', marginBottom:'1rem' }}>
                    <div style={{ width:56, height:56, background:'#fef3c7', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.3s', transform:hoveredFeature===index?'scale(1.1) rotate(-5deg)':'scale(1)' }}>
                      <img src={feature.image} alt={feature.title} style={{ width:48, height:48, objectFit:'contain' }}
                        onError={e=>{ e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                      <i className={`fas ${feature.icon}`} style={{ fontSize:'1.6rem', color:'#d97706', display:'none' }}></i>
                    </div>
                    <div>
                      <span style={{ display:'inline-block', background:'rgba(255,193,7,0.12)', color:'#b45309', padding:'1px 10px', borderRadius:100, fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:4 }}>{feature.featureLabel}</span>
                      <h3 style={{ fontSize:'1.25rem', fontWeight:'700', color:'#111827', margin:0 }}>{feature.title}</h3>
                    </div>
                  </div>
                  <p style={{ color:'#6b7280', lineHeight:'1.6', marginBottom:0 }}>{feature.description}</p>
                </div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* ════ CTA BAND ════ */}
      <section style={{ padding:'5rem 0', background:'#1a1a1a', zoom:'0.75', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'#ffc107', opacity:0.06, filter:'blur(80px)', top:'-20%', right:'-5%' }} />
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'#3b82f6', opacity:0.05, filter:'blur(60px)', bottom:'-20%', left:'-5%' }} />
        <Container style={{ textAlign:'center', position:'relative', zIndex:1 }}>
          <span className="section-eyebrow" style={{ color:'#ffc107' }}>Get Started Today</span>
          <h2 className="cta-band-title" style={{ fontSize:'2.8rem', fontWeight:'800', color:'#fff', marginBottom:'1rem' }}>Keep Your Pets Safe with PetUnity</h2>
          <p className="cta-band-sub" style={{ fontSize:'1.2rem', color:'rgba(255,255,255,0.55)', maxWidth:520, margin:'0 auto 2.5rem', lineHeight:1.6 }}>
            Join thousands of pet owners in Muntinlupa City managing their pets' health records, schedules, and safety — all in one place.
          </p>
          <div className="cta-band-btns" style={{ display:'flex', gap:'1rem', justifyContent:'center', flexWrap:'wrap' }}>
            <button className="cta-btn-primary" onClick={()=>navigate('/register')} style={{ fontSize:'1rem', padding:'0.95rem 2.4rem' }}>
              <i className="fas fa-user-plus"></i> Create Free Account
            </button>
            <button onClick={()=>navigate('/login')}
              style={{ display:'inline-flex', alignItems:'center', gap:'0.6rem', background:'rgba(255,255,255,0.07)', color:'rgba(255,255,255,0.8)', border:'1.5px solid rgba(255,255,255,0.15)', borderRadius:14, padding:'0.93rem 2rem', fontWeight:700, fontSize:'1rem', cursor:'pointer', transition:'all 0.25s' }}
              onMouseOver={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.13)'; e.currentTarget.style.color='#fff'; }}
              onMouseOut={e=>{ e.currentTarget.style.background='rgba(255,255,255,0.07)'; e.currentTarget.style.color='rgba(255,255,255,0.8)'; }}>
              <i className="fas fa-sign-in-alt"></i> Sign In
            </button>
          </div>
        </Container>
      </section>

    </div>
  );
};

export default LandingPage;