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

  /* load Google Maps JS */
  useEffect(() => {
    if (window.google && window.google.maps) { setLeafletLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyB72rFhd2GZd0PKiWSI_duS5WXDWXQb0To';
    script.async = true;
    script.defer = true;
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

  /* init Google Map — bounds locked to Muntinlupa */
useEffect(() => {
  if (!leafletLoaded || !leafletMapRef.current || leafletInstanceRef.current) return;

  const initMap = () => {
    if (!leafletMapRef.current) return;
    const el = leafletMapRef.current;
    if (!el.offsetWidth || !el.offsetHeight) {
      setTimeout(initMap, 150);
      return;
    }

    const google = window.google;
    const map = new google.maps.Map(el, {
      center: { lat: MUNTI_CENTER[0], lng: MUNTI_CENTER[1] },
      zoom: 13,
      minZoom: 12,
      maxZoom: 22,
      scrollwheel: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      restriction: {
        latLngBounds: {
          north: MUNTI_BOUNDS[1][0],
          south: MUNTI_BOUNDS[0][0],
          west:  MUNTI_BOUNDS[0][1],
          east:  MUNTI_BOUNDS[1][1],
        },
        strictBounds: true,
      },
      styles: [
        { featureType:'poi', elementType:'labels', stylers:[{ visibility:'off' }] },
      ],
    });

    // Draw boundary polygon
    new google.maps.Polygon({
      paths: BOUNDARY.map(([lat, lng]) => ({ lat, lng })),
      strokeColor: '#ffc107',
      strokeOpacity: 0.8,
      strokeWeight: 2.5,
      fillColor: '#ffc107',
      fillOpacity: 0,
      map,
    });

    leafletInstanceRef.current = map;
  };

  initMap();

}, [leafletLoaded]);

  /* render report markers + danger circles */
  useEffect(() => {
    if (!leafletInstanceRef.current || !leafletLoaded) return;
    const google = window.google;
    const map    = leafletInstanceRef.current;

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
          strokeWeight:  2.5,
          fillColor:     isPos ? '#e00000' : '#f0c800',
          fillOpacity:   isPos ? 0.12 : 0.10,
        });
        const labelMarker = new google.maps.Marker({
          position: { lat: o.lat + 0.0085, lng: o.lng },
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
  }, [mapReports, leafletLoaded]);

  /* render clinic markers — identical to OwnerMapStatus */
    useEffect(() => {
    if (!leafletInstanceRef.current || !leafletLoaded) return;
    const google = window.google;
    const map    = leafletInstanceRef.current;

    clinicMarkersRef.current.forEach(m => m.setMap(null));
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

      const m = new google.maps.Marker({
        position: { lat, lng },
        map,
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="${isCityVet?48:32}" height="${isCityVet?58:40}" viewBox="0 0 ${isCityVet?48:32} ${isCityVet?58:40}">
              <circle cx="${isCityVet?24:16}" cy="${isCityVet?22:16}" r="${isCityVet?20:14}" fill="${isCityVet?'#ffc107':'#0d6efd'}" stroke="white" stroke-width="2.5"/>
              <text x="${isCityVet?24:16}" y="${isCityVet?28:21}" text-anchor="middle" font-size="${isCityVet?16:12}" fill="white">🏥</text>
              <rect x="${isCityVet?22:14}" y="${isCityVet?42:30}" width="4" height="${isCityVet?10:8}" rx="2" fill="rgba(0,0,0,0.25)"/>
            </svg>`)}`,
          scaledSize: new google.maps.Size(isCityVet?48:32, isCityVet?58:40),
          anchor: new google.maps.Point(isCityVet?24:16, isCityVet?58:40),
        },
        clickable: false,
      });
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
      <section id="map-feature" style={{ padding:'5rem 0 6rem', background:'#0a0f1e', zoom:'0.75', position:'relative', overflow:'hidden' }}>

        {/* Background grid */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(255,193,7,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,193,7,0.03) 1px, transparent 1px)', backgroundSize:'48px 48px', pointerEvents:'none' }} />
        {/* Glow blobs */}
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle, rgba(255,193,7,0.07) 0%, transparent 70%)', top:'-10%', left:'-5%', pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(56,189,248,0.06) 0%, transparent 70%)', bottom:'0%', right:'5%', pointerEvents:'none' }} />

        <Container style={{ position:'relative', zIndex:2 }}>

          {/* Section header */}
          <div style={{ marginBottom:'3rem' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'0.6rem', marginBottom:'1rem' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#ffc107', boxShadow:'0 0 8px #ffc107' }} />
              <span style={{ color:'#ffc107', fontSize:'0.75rem', fontWeight:600, letterSpacing:'0.5px' }}>Live Intelligence</span>
            </div>
            <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
              <h2 style={{ fontSize:'2.6rem', fontWeight:800, color:'#fff', margin:0, lineHeight:1.15, maxWidth:520 }}>
                Rabies activity,<br/>
                <span style={{ color:'#ffc107' }}>mapped in real time</span>
              </h2>
              <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.95rem', lineHeight:1.7, maxWidth:320, margin:0 }}>
                PetUnity monitors Muntinlupa City 24/7 — every confirmed case, every clinic, every danger zone updated live.
              </p>
            </div>
          </div>

          <Row className="g-4 align-items-stretch">

            {/* LEFT — stat cards + feature list */}
            <Col lg={4} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

              {/* Stat row */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0.75rem' }}>
                {[
                  { value:'16', label:'Barangays covered',  accent:'#ffc107' },
                  { value:'1km', label:'Danger zone radius', accent:'#ef4444' },
                  { value:'24/7', label:'Live monitoring',   accent:'#38bdf8' },
                  { value:'Free', label:'For all residents', accent:'#10b981' },
                ].map((s, i) => (
                  <div key={i} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'1rem 1.1rem', backdropFilter:'blur(8px)' }}>
                    <div style={{ fontSize:'1.6rem', fontWeight:800, color:s.accent, lineHeight:1, marginBottom:4 }}>{s.value}</div>
                    <div style={{ fontSize:'0.68rem', color:'rgba(255,255,255,0.45)', lineHeight:1.4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Feature list */}
              <div style={{ display:'flex', flexDirection:'column', gap:'0.5rem', flex:1 }}>
                {[
                  { color:'#ef4444', dot:'☣️', title:'Confirmed cases',   desc:'Positive rabies reports pinned with exact barangay location.' },
                  { color:'#f0c800', dot:'⚠️', title:'Suspected cases',   desc:'Unconfirmed alerts shown with 1km monitoring radius.' },
                  { color:'#ffc107', dot:'🏥', title:'City Vet Office',   desc:'Government clinic with direct contact and hours.' },
                  { color:'#38bdf8', dot:'🏥', title:'Private clinics',   desc:'Accredited vets near you with specialty info.' },
                ].map((f, i) => (
                  <div key={i} style={{ display:'flex', gap:'0.85rem', alignItems:'flex-start', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'0.85rem 1rem', transition:'border-color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor='rgba(255,193,7,0.25)'}
                    onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,0.06)'}
                  >
                    <div style={{ width:32, height:32, borderRadius:8, background:`${f.color}18`, border:`1px solid ${f.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{f.dot}</div>
                    <div>
                      <div style={{ fontSize:'0.82rem', fontWeight:700, color:'#fff', marginBottom:2 }}>{f.title}</div>
                      <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.4)', lineHeight:1.5 }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <button onClick={() => navigate('/owner/map-status')}
                style={{ width:'100%', background:'linear-gradient(135deg,#ffc107,#f59e0b)', color:'#0a0f1e', border:'none', borderRadius:12, padding:'0.9rem', fontWeight:800, fontSize:'0.9rem', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', boxShadow:'0 8px 24px rgba(255,193,7,0.25)', transition:'all 0.25s' }}
                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 12px 32px rgba(255,193,7,0.35)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(255,193,7,0.25)'; }}
              >
                <i className="fas fa-expand-alt" style={{ fontSize:'0.8rem' }}></i>
                Open Full Map
              </button>

            </Col>

            {/* RIGHT — map card */}
            <Col lg={8}>
              <div style={{ background:'#0d1424', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, overflow:'hidden', height:'100%', minHeight:520, display:'flex', flexDirection:'column', boxShadow:'0 32px 80px rgba(0,0,0,0.5)' }}>

                {/* Map toolbar */}
                <div style={{ padding:'0.75rem 1.25rem', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', background:'rgba(255,255,255,0.02)', flexShrink:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                    <div style={{ display:'flex', gap:'5px' }}>
                      {['#ff5f57','#febc2e','#28c840'].map((c,i) => <div key={i} style={{ width:9, height:9, borderRadius:'50%', background:c }} />)}
                    </div>
                    <div style={{ width:1, height:14, background:'rgba(255,255,255,0.1)' }} />
                    <span style={{ color:'rgba(255,255,255,0.6)', fontSize:'0.75rem', fontWeight:500 }}>
                      Muntinlupa City · Rabies Activity
                    </span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 6px #10b981' }} />
                    <span style={{ color:'rgba(255,255,255,0.35)', fontSize:'0.68rem' }}>Live</span>
                  </div>
                </div>

                {/* Map */}
                <div style={{ position:'relative', flex:1 }}>
                  <div ref={leafletMapRef} className="map-leaflet-div" style={{ height:'100%', minHeight:440, width:'100%' }} />

                  {/* Scanner */}
                  <div style={{ position:'absolute', left:0, right:0, height:1, background:'linear-gradient(90deg,transparent,rgba(255,193,7,0.5),transparent)', animation:'scanLine 4s linear infinite', pointerEvents:'none', zIndex:998 }} />

                  {/* Legend — bottom left glass pill */}
                  <div style={{ position:'absolute', bottom:16, left:16, zIndex:999, background:'rgba(10,15,30,0.85)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'0.65rem 0.9rem', display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                    {[
                      { color:'#ef4444', emoji:'☣️', label:'Positive' },
                      { color:'#f0c800', emoji:'⚠️', label:'Suspected' },
                      { color:'#ffc107', emoji:'🏥', label:'City Vet' },
                      { color:'#38bdf8', emoji:'🏥', label:'Clinic' },
                    ].map((l, i) => (
                      <div key={i} style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                        <div style={{ width:16, height:16, borderRadius:4, background:`${l.color}25`, border:`1px solid ${l.color}60`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, flexShrink:0 }}>{l.emoji}</div>
                        <span style={{ fontSize:'0.65rem', color:'rgba(255,255,255,0.6)', fontWeight:500 }}>{l.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Coordinates badge — bottom right */}
                  <div style={{ position:'absolute', bottom:16, right:16, zIndex:999, background:'rgba(10,15,30,0.85)', backdropFilter:'blur(12px)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'0.4rem 0.75rem' }}>
                    <span style={{ fontSize:'0.62rem', color:'rgba(255,255,255,0.35)', fontFamily:'monospace' }}>14.4081° N · 121.0415° E</span>
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
              <i className="fas fa-user-plus"></i> Create Account
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