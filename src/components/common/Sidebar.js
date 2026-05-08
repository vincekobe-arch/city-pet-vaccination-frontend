import React, { useState, useEffect, useRef } from 'react';
import { Navbar as BootstrapNavbar, Nav, Container, Modal, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { getUser } from '../../utils/auth';
import { getAllProvinces, getAllRegions, getMunicipalitiesByProvince, getBarangaysByMunicipality } from '@aivangogh/ph-address';

const SCAN_SUCCESS_SOUND = 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU' +
  'lvT18A'; // placeholder

const ownerAPI = {
  getByUserId: (userId) => api.get(`/owners/user/${userId}`),
  update:      (id, data) => api.put(`/owners/${id}`, data),
  submitId:    (userId, formData) => api.post(`/owners/${userId}/submit-id`, formData, {
    headers: { 'Content-Type': 'application/json' }
  }),
};

const VALID_ID_TYPES = [
  "Muntinlupa Care Card", "Philippine Passport", "Driver's License", "SSS ID", "GSIS ID",
  "PhilHealth ID", "Pag-IBIG ID", "Voter's ID", "Postal ID",
  "National ID (PhilSys)", "PRC ID", "Senior Citizen ID", "PWD ID",
  "Barangay ID", "Company ID", "School ID", "Other"
];

const VERIFICATION_CONFIG = {
  not_verified:   { label: 'Not Verified',   color: '#dc3545', icon: 'fa-times-circle' },
  pending:        { label: 'Pending Review', color: '#fd7e14', icon: 'fa-hourglass-half' },
  semi_verified:  { label: 'Semi Verified',  color: '#0d6efd', icon: 'fa-shield-alt' },
  fully_verified: { label: 'Fully Verified', color: '#198754', icon: 'fa-check-circle' },
};

const Sidebar = ({ user, onLogout, darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scanResult, setScanResult] = useState('');
  const [scanSucess, setScanSucess] = useState(false);
  const [scanError, setScanError] = useState(false);
  const scannerStateRef = useRef('idle'); // 'idle' | 'error' | 'success'
  const scanErrorTimerRef = useRef(null);
const streamRef = useRef(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [petsDropdownOpen, setPetsDropdownOpen] = useState(false);
  const [usersDropdownOpen, setUsersDropdownOpen] = useState(false);
  const [showSignOut, setShowSignOut] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [dropdownClosing, setDropdownClosing] = useState(false);
  const dropdownOpenRef = useRef(false);

  const closeDropdown = () => {
    if (!dropdownOpenRef.current) return;
    setDropdownClosing(true);
    setTimeout(() => {
      setShowProfileDropdown(false);
      setDropdownClosing(false);
      dropdownOpenRef.current = false;
    }, 200);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeDropdown()
    };
    const handleCloseDropdown = () => closeDropdown();
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('closeProfileDropdown', handleCloseDropdown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('closeProfileDropdown', handleCloseDropdown);
    };
  }, []);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [sidebarAnim, setSidebarAnim] = useState('');
  const [mobileNavAnim, setMobileNavAnim] = useState('');
  const [mobileTopAnim, setMobileTopAnim] = useState('');

  // Detect coming back from edit-profile — trigger slide-in
  const prevPathRef = React.useRef(location.pathname);
  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = location.pathname;
    if (prev === '/edit-profile' && location.pathname !== '/edit-profile') {
      setSidebarAnim('sidebar-slide-in');
      setMobileNavAnim('mobile-nav-slide-in');
      setMobileTopAnim('mobile-top-slide-in');
      const t = setTimeout(() => { setSidebarAnim(''); setMobileNavAnim(''); setMobileTopAnim(''); }, 350);
      return () => clearTimeout(t);
    }
  }, [location.pathname]);
  const [editProfileForm, setEditProfileForm] = useState({
    first_name: '', middle_name: '', last_name: '', phone: '',
    current_password: '', new_password: '', confirm_password: ''
  });
  const [editProfileLoading, setEditProfileLoading] = useState(false);
  const [editProfileError, setEditProfileError] = useState('');
  const [editProfileSuccess, setEditProfileSuccess] = useState('');

  // Verification
  const [ownerProfile, setOwnerProfile]         = useState(null);
  const [pendingVerifCount, setPendingVerifCount] = useState(0);
const [expiredBatchCount, setExpiredBatchCount] = useState(0);
const [pendingReportCount, setPendingReportCount] = useState(0);
  const [showVerifyModal, setShowVerifyModal]   = useState(false);
  const [verifyStep, setVerifyStep]             = useState(1);
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifyError, setVerifyError]           = useState('');
  const [verifySuccess, setVerifySuccess]       = useState('');
  const [profileForm, setProfileForm] = useState({
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
  const [selfieFile, setSelfieFile]         = useState(null);
  const [idFrontPreview, setIdFrontPreview] = useState('');
  const [idBackPreview, setIdBackPreview]   = useState('');
  const [selfiePreview, setSelfiePreview]   = useState('');
  const [profileFieldErrors, setProfileFieldErrors] = useState({});

  useEffect(() => {
    if (!showScannerModal || scanResult) return;
    let scanner = null;
    let cancelled = false;
    scannerStateRef.current = 'idle';

    const originalOnError = window.onerror;
    window.onerror = (msg, src, line, col, err) => {
      if (typeof msg === 'string' && (
        msg.includes('play()') ||
        msg.includes('removed from the document') ||
        msg.includes('onabort') ||
        msg.includes('Cannot stop') ||
        msg.includes('scanner is not running')
      )) return true;
      return originalOnError ? originalOnError(msg, src, line, col, err) : false;
    };

    const killStream = () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} });
        streamRef.current = null;
      }
      try {
        const el = document.getElementById('qr-reader');
        if (el) {
          el.querySelectorAll('video, audio').forEach(media => {
            try {
              if (media.srcObject) {
                media.srcObject.getTracks().forEach(t => { try { t.stop(); } catch {} });
                media.srcObject = null;
              }
              media.pause();
              media.load();
            } catch {}
          });
        }
      } catch {}
    };

    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        if (cancelled) { killStream(); return; }

        const el = document.getElementById('qr-reader');
        if (!el || cancelled) { killStream(); return; }

        scanner = new Html5Qrcode('qr-reader', {
          verbose: false,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true }
        });

        if (cancelled) { killStream(); return; }

        const originalGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = async (constraints) => {
          const stream = await originalGetUserMedia(constraints);
          streamRef.current = stream;
          navigator.mediaDevices.getUserMedia = originalGetUserMedia;
          return stream;
        };

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 15, qrbox: { width: 280, height: 280 }, aspectRatio: 1.0, disableFlip: false },
          (decodedText) => {
            if (scannerStateRef.current !== 'idle') return;

            let isValid = false;
            try {
              const parsed = JSON.parse(decodedText);
              isValid = !!(parsed.microchip && parsed.name && parsed.reg_no);
            } catch {
              isValid = false;
            }

            if (isValid) {
              scannerStateRef.current = 'success';
              playScanBeep();
              setScanSucess(true);
              setTimeout(() => {
                if (cancelled) return;
                setScanSucess(false);
                scannerStateRef.current = 'idle';
                setScanResult(decodedText);
              }, 1200);
            } else {
              scannerStateRef.current = 'error';
              playScanErrorSound();
              setScanError(true);
              if (scanErrorTimerRef.current) clearTimeout(scanErrorTimerRef.current);
              scanErrorTimerRef.current = setTimeout(() => {
                if (cancelled) return;
                setScanError(false);
                scannerStateRef.current = 'idle';
              }, 2500);
            }
          },
          () => {}
        );

        if (cancelled) {
          killStream();
          await scanner.stop().catch(() => {});
          scanner = null;
          return;
        }

      } catch (err) {
        killStream();
        if (!cancelled && err?.message && !err.message.includes('play()') && !err.message.includes('removed from the document')) {
          console.error('Camera error:', err);
        }
        if (scanner) {
          scanner.stop().catch(() => {});
        }
      }
    };

    const timer = setTimeout(initScanner, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (scanErrorTimerRef.current) clearTimeout(scanErrorTimerRef.current);
      setScanSucess(false);
      setScanError(false);
      scannerStateRef.current = 'idle';

      window.onerror = originalOnError;

      killStream();

      if (scanner) {
        try {
          const state = scanner.getState();
          if (state === 2 || state === 3) {
            scanner.stop().catch(() => {}).finally(() => killStream());
          } else {
            killStream();
          }
        } catch {
          killStream();
        }
        scanner = null;
      }
    };
  }, [showScannerModal, scanResult]);

  useEffect(() => {
    if (!showScannerModal) setScanResult('');
  }, [showScannerModal]);

  const playScanBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o1 = ctx.createOscillator();
      const o2 = ctx.createOscillator();
      const gain = ctx.createGain();
      o1.connect(gain); o2.connect(gain); gain.connect(ctx.destination);
      o1.type = 'sine'; o1.frequency.setValueAtTime(880, ctx.currentTime);
      o1.frequency.setValueAtTime(1200, ctx.currentTime + 0.1);
      o2.type = 'sine'; o2.frequency.setValueAtTime(1100, ctx.currentTime);
      o2.frequency.setValueAtTime(1400, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      o1.start(ctx.currentTime); o1.stop(ctx.currentTime + 0.35);
      o2.start(ctx.currentTime); o2.stop(ctx.currentTime + 0.35);
    } catch {}
  };

  const playScanErrorSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const o1 = ctx.createOscillator();
      const gain = ctx.createGain();
      o1.connect(gain); gain.connect(ctx.destination);
      o1.type = 'sawtooth';
      o1.frequency.setValueAtTime(300, ctx.currentTime);
      o1.frequency.setValueAtTime(150, ctx.currentTime + 0.15);
      o1.frequency.setValueAtTime(100, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      o1.start(ctx.currentTime); o1.stop(ctx.currentTime + 0.45);
    } catch {}
  };

  useEffect(() => {
    if (location.pathname === '/admin/pets' || location.pathname === '/admin/vet-cards') {
      setPetsDropdownOpen(true);
    }
    if (location.pathname === '/super-admin/officials' || location.pathname === '/super-admin/owners') {
      setUsersDropdownOpen(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (user?.role === 'barangay_official') {
      api.get('/owners').then(res => {
        const owners = res.data.owners || [];
        const pending = owners.filter(o => o.verification_status === 'pending').length;
        setPendingVerifCount(pending);
      }).catch(() => {});

      api.get('/reports').then(res => {
        const reports = res.data.reports || [];
        const pendingReports = reports.filter(r => r.status === 'pending').length;
        setPendingReportCount(pendingReports);
      }).catch(() => {});

      api.get('/inventory').then(res => {
        const items = res.data.inventory || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiredItems = items.filter(item => {
          // We'll count items that have at least one expired batch
          // We don't have batch data here, so we fetch separately
          return false;
        });
        // Fetch all batches to check expiry
        Promise.all(items.map(item =>
          api.get(`/inventory/batches/${item.id}`).then(r => r.data.batches || []).catch(() => [])
        )).then(allBatches => {
          const flat = allBatches.flat();
          const expired = flat.filter(b => b.expiration_date && new Date(b.expiration_date) < today && parseInt(b.quantity) > 0).length;
          setExpiredBatchCount(expired);
        });
      }).catch(() => {});
    }

    if (user?.role === 'pet_owner') {
      ownerAPI.getByUserId(user.id).then(res => {
        const owner = res.data.owner;
        setOwnerProfile(owner);
        setProfileForm({
          first_name:  owner.first_name  || '',
          middle_name: owner.middle_name || '',
          last_name:   owner.last_name   || '',
          birthdate:   owner.birthdate   || '',
          gender:      owner.gender      || '',
          phone:       owner.phone       || '',
        });
      }).catch(() => {});
      const ncr = getAllRegions().find(r => r.name.includes('National Capital'));
      const metroManila = ncr ? { name: 'Metro Manila', psgcCode: ncr.psgcCode, regionCode: ncr.psgcCode } : null;
      const sorted = [
        ...(metroManila ? [metroManila] : []),
        ...getAllProvinces().sort((a, b) => a.name.localeCompare(b.name)),
      ];
      setProvinces(sorted);
    }
  }, [user]);

  // Hide sidebar on vet card view pages, login page, and register page
  const hideRoutes = ['/vet-card-view/', '/login', '/register', '/edit-profile'];
  const shouldHide = hideRoutes.some(route => location.pathname.includes(route));
  const isLandingPage = location.pathname === '/';

  if (shouldHide) return null;

  // ─── LANDING PAGE: original top navbar (light only, no dark mode toggle) ─
  if (isLandingPage) {
    const scrollTo = (id) => {
      if (id === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
      else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const linkStyle = {
      color: '#1a1a1a', fontWeight: '600', fontSize: '0.95rem',
      padding: '0.7rem 1.4rem', borderRadius: '12px',
      transition: 'all 0.3s ease', marginRight: '0.5rem', cursor: 'pointer',
    };
    const hoverIn = (e) => {
      e.currentTarget.style.background = 'rgba(255,193,7,0.15)';
      e.currentTarget.style.transform = 'translateY(-3px)';
      e.currentTarget.style.boxShadow = '0 4px 12px rgba(255,193,7,0.25)';
    };
    const hoverOut = (e) => {
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = 'none';
    };
    return (
      <BootstrapNavbar expand="lg" sticky="top" variant="light" style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(245,245,245,0.98) 100%)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(255,193,7,0.08)',
        padding: '0.75rem 0', backdropFilter: 'blur(20px) saturate(180%)',
        minHeight: '75px', zoom: '0.75', borderBottom: '1px solid rgba(0,0,0,0.08)',
      }}>
        <Container fluid style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
          <BootstrapNavbar.Brand as={Link} to="/"
            className="landing-brand"
            style={{ fontWeight: '700', fontSize: '1.5rem', display: 'flex', alignItems: 'center', transition: 'all 0.4s ease' }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <img src="/logo.png" alt="Logo"
              style={{ width: '48px', height: '48px', objectFit: 'contain', marginRight: '0.85rem', filter: 'drop-shadow(0 0 8px rgba(255,193,7,0.3))' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span>
              <span style={{ color: '#ffc107', textShadow: '0 0 10px rgba(255,193,7,0.5)' }}>Pet</span>
              <span style={{ color: '#1a1a1a' }}>Unity</span>
            </span>
          </BootstrapNavbar.Brand>
          <BootstrapNavbar.Collapse id="landing-nav">
            <Nav className="mx-auto landing-nav-links">
              {[
                { id: 'home',     label: 'Home',     icon: 'fa-home' },
                { id: 'about',    label: 'About',    icon: 'fa-info-circle' },
                { id: 'features', label: 'Features', icon: 'fa-star' },
                { id: 'contact',  label: 'Contact',  icon: 'fa-envelope' },
              ].map(({ id, label, icon }) => (
                <Nav.Link key={id} onClick={() => scrollTo(id)} style={linkStyle} onMouseOver={hoverIn} onMouseOut={hoverOut}>
                  <i className={`fas ${icon} landing-nav-icon`}></i><span className="landing-nav-label"> {label}</span>
                </Nav.Link>
              ))}
            </Nav>
          </BootstrapNavbar.Collapse>
          <Nav className="ms-0">
            <div className="d-flex gap-3 align-items-center">
              <Button onClick={() => navigate('/login')} style={{
                background: '#ffc107', border: 'none', color: '#000',
                padding: '0.6rem 1.2rem', fontSize: '0.95rem', fontWeight: '600',
                borderRadius: '25px', boxShadow: '0 2px 10px rgba(255,193,7,0.3)',
                minWidth: '120px', transition: 'all 0.3s',
              }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(255,193,7,0.5)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(255,193,7,0.3)'; }}
              >
                <i className="fas fa-sign-in-alt me-2"></i>Login
              </Button>
            </div>
          </Nav>
        </Container>
      </BootstrapNavbar>
    );
  }

  const isActive = (path) => location.pathname === path;

  const bg = darkMode
    ? 'linear-gradient(180deg, #0d0d0d 0%, #111111 100%)'
    : 'linear-gradient(180deg, #ffffff 0%, #f9f9f9 100%)';

  const border = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const textColor = darkMode ? '#e0e0e0' : '#1a1a1a';
  const subTextColor = darkMode ? '#666' : '#aaa';

  const sidebarWidth = collapsed ? '72px' : '240px';

  // ─── Nav link configs per role ───────────────────────────────────────────
  const getLandingLinks = () => [
    { label: 'Home', icon: 'fa-home', action: () => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileOpen(false); } },
    { label: 'About', icon: 'fa-info-circle', action: () => { document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); setMobileOpen(false); } },
    { label: 'Features', icon: 'fa-star', action: () => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); setMobileOpen(false); } },
    { label: 'Contact', icon: 'fa-envelope', action: () => { document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' }); setMobileOpen(false); } },
  ];

  const getAuthLinks = () => {
    if (!user) return isLandingPage ? getLandingLinks() : [];
    switch (user.role) {
      case 'super_admin':
        return [
          { label: 'Dashboard', icon: 'fa-home', to: '/super-admin/dashboard' },
          
          { label: 'Users', icon: 'fa-users', dropdown: true, dropdownKey: 'users', children: [
            { label: 'Admins', icon: 'fa-user-tie', to: '/super-admin/officials' },
            { label: 'Community', icon: 'fa-users', to: '/super-admin/owners' },
          ]},
          { label: 'Pets', icon: 'fa-paw', to: '/super-admin/pets' },
        ];
      case 'barangay_official':
        return [
          { label: 'Dashboard', icon: 'fa-home', to: '/admin/dashboard' },
          { label: 'Pets', icon: 'fa-paw', dropdown: true, dropdownKey: 'pets', children: [
            { label: 'Pets', icon: 'fa-dog', to: '/admin/pets' },
            { label: 'Vet  Cards', icon: 'fa-id-card', to: '/admin/vet-cards' },
          ]},
          { label: 'Community', icon: 'fa-users', to: '/admin/owners', badge: pendingVerifCount },
          { label: 'Records', icon: 'fa-syringe', to: '/admin/vaccinations' },
          { label: 'Events', icon: 'fa-calendar-alt', to: '/admin/schedules' },
          { label: 'Reports', icon: 'fa-flag', to: '/admin/reports', badge: pendingReportCount },
          { label: 'Inventory', icon: 'fa-boxes', to: '/admin/inventory', badge: expiredBatchCount },
          { label: 'Map Status', icon: 'fa-map-marked-alt', to: '/admin/map-status' },
          { label: 'Clinics', icon: 'fa-hospital', to: '/admin/clinics' },
        ];
      case 'pet_owner':
        return [
          { label: 'Dashboard', icon: 'fa-home', to: '/owner/dashboard' },
          { label: 'My Pets', icon: 'fa-paw', to: '/owner/pet-status' },
          { label: 'Events', icon: 'fa-calendar', to: '/owner/schedule' },
          { label: 'Reports', icon: 'fa-flag', to: '/owner/reports' },
          { label: 'Map Status', icon: 'fa-map-marked-alt', to: '/owner/map-status' },
        ];
      case 'private_clinic':
  return [
    { label: 'Dashboard', icon: 'fa-home', to: '/clinic/dashboard' },
    { label: 'Records', icon: 'fa-clipboard-list', to: '/clinic/records' },
    { label: 'Reports', icon: 'fa-flag', to: '/clinic/reports' },
    { label: 'Inventory', icon: 'fa-boxes', to: '/clinic/inventory' },
  ];
      default:
        return [];
    }
  };

  const links = getAuthLinks();

  const roleConfig = {
    super_admin: { name: 'Super Admin', color: '#ef4444', icon: 'fa-crown' },
    barangay_official: { name: 'Barangay Admin', color: '#ffc107', icon: 'fa-shield-alt' },
    
    private_clinic: { name: 'Private Clinic', color: '#22c55e', icon: 'fa-hospital' },
  };
  const role = user ? roleConfig[user.role] : null;

  // ─── Verification handlers ───────────────────────────────────────────────

  const handleOpenVerifyModal = () => {
    setVerifyStep(1);
    setVerifyError('');
    setVerifySuccess('');
    setProfileFieldErrors({});
    setIdForm({ valid_id_type: '', address: '', house_no: '', street: '', province: '', city: '', barangay: '' });
    setCities([]);
    setBarangayList([]);
    setIdFrontFile(null); setIdBackFile(null); setSelfieFile(null);
    setIdFrontPreview(''); setIdBackPreview(''); setSelfiePreview('');
    setShowVerifyModal(true);
  };

  const handleProfileFormChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
    if (verifyError) setVerifyError('');

    if (['first_name', 'middle_name', 'last_name'].includes(name)) {
      if (value && !/^[a-zA-Z.\s-]*$/.test(value)) {
        setProfileFieldErrors(prev => ({ ...prev, [name]: 'Only letters, dots, spaces, and hyphens allowed' }));
      } else if (value && value.startsWith(' ')) {
        setProfileFieldErrors(prev => ({ ...prev, [name]: 'Cannot start with a space' }));
      } else if (value && value.startsWith('-')) {
        setProfileFieldErrors(prev => ({ ...prev, [name]: 'Cannot start with a hyphen' }));
      } else if (value && /\s{2,}/.test(value)) {
        setProfileFieldErrors(prev => ({ ...prev, [name]: 'Cannot contain multiple consecutive spaces' }));
      } else if (value && /--/.test(value)) {
        setProfileFieldErrors(prev => ({ ...prev, [name]: 'Cannot contain consecutive hyphens' }));
      } else {
        setProfileFieldErrors(prev => ({ ...prev, [name]: '' }));
      }
    }

    if (name === 'phone') {
      setProfileFieldErrors(prev => ({ ...prev, phone: value && !/^09\d{9}$/.test(value) ? 'Phone must be 11 digits starting with 09' : '' }));
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

  const handleFileChange = (e, setter, previewSetter) => {
    const file = e.target.files[0];
    if (!file) return;
    setter(file);
    previewSetter(URL.createObjectURL(file));
  };

  const handleVerifyStep1Next = async () => {
    if (!profileForm.first_name.trim() || !profileForm.last_name.trim()) { setVerifyError('First name and last name are required.'); return; }
    if (!profileForm.phone.trim() || !/^09\d{9}$/.test(profileForm.phone)) { setVerifyError('Enter a valid 11-digit phone number starting with 09.'); return; }
    const hasNameErrors = profileFieldErrors.first_name || profileFieldErrors.middle_name || profileFieldErrors.last_name || profileFieldErrors.phone;
    if (hasNameErrors) { setVerifyError('Please fix the errors in the form before continuing.'); return; }
    setVerifyError('');
    try {
      setVerifySubmitting(true);
      const u = getUser();
      await ownerAPI.update(u?.id || u?.user_id, profileForm);
      setVerifyStep(2);
    } catch (err) {
      setVerifyError(err.response?.data?.error || 'Failed to save profile. Please try again.');
    } finally {
      setVerifySubmitting(false);
    }
  };

  const handleVerifySubmit = async () => {
    if (!idForm.province)       { setVerifyError('Please select a province.');            return; }
    if (!idForm.city)           { setVerifyError('Please select a city / municipality.'); return; }
    if (!idForm.barangay)       { setVerifyError('Please select a barangay.');            return; }
    if (!idForm.address.trim()) { setVerifyError('Please complete your address.');        return; }
    if (!idForm.valid_id_type)  { setVerifyError('Please select a valid ID type.');       return; }
    if (!idFrontFile)           { setVerifyError('Please upload the front of your ID.');  return; }
    try {
      setVerifySubmitting(true);
      setVerifyError('');
      const u = getUser();
      const toBase64 = (file) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); });
      const frontB64  = await toBase64(idFrontFile);
      const backB64   = idBackFile  ? await toBase64(idBackFile)  : null;
      const selfieB64 = selfieFile  ? await toBase64(selfieFile)  : null;
      await ownerAPI.submitId(u.id, { valid_id_type: idForm.valid_id_type, valid_id_front: frontB64, valid_id_back: backB64, selfie_with_id: selfieB64, address: idForm.address });
      setVerifySuccess('Your ID has been submitted! Our team will review it shortly.');
      const res = await ownerAPI.getByUserId(u.id);
      setOwnerProfile(res.data.owner);
      setTimeout(() => { setShowVerifyModal(false); setVerifySuccess(''); }, 3000);
    } catch (err) {
      setVerifyError('Failed to submit ID. Please try again.');
    } finally {
      setVerifySubmitting(false);
    }
  };

  // ─── Shared link renderer ────────────────────────────────────────────────
  const renderLink = (link, idx) => {
  // Dropdown group renderer
  if (link.dropdown) {
    const anyChildActive = link.children?.some(c => isActive(c.to));
    const isOpen = link.dropdownKey === 'users' ? usersDropdownOpen : petsDropdownOpen;

    const groupStyle = {
      display: 'flex',
      alignItems: 'center',
      gap: collapsed ? 0 : '0.75rem',
      padding: collapsed ? '0.75rem' : '0.7rem 1rem',
      borderRadius: '12px',
      marginBottom: '3px',
      cursor: 'pointer',
      transition: 'all 0.25s ease',
      background: anyChildActive
        ? 'linear-gradient(135deg, rgba(255,193,7,0.15) 0%, rgba(255,179,0,0.15) 100%)'
        : 'transparent',
      color: anyChildActive ? '#ffc107' : (darkMode ? '#bbbbbb' : '#333333'),
      fontWeight: anyChildActive ? '700' : '500',
      fontSize: '0.875rem',
      justifyContent: collapsed ? 'center' : 'flex-start',
      position: 'relative',
      whiteSpace: 'nowrap',
      userSelect: 'none',
    };

    return (
      <div key={idx}>
        <div
          style={groupStyle}
          onClick={() => {
            if (!collapsed) {
              if (link.dropdownKey === 'users') setUsersDropdownOpen(o => !o);
              else setPetsDropdownOpen(o => !o);
            }
          }}
          onMouseOver={(e) => {
            if (!anyChildActive) {
              e.currentTarget.style.background = darkMode ? 'rgba(255,193,7,0.1)' : 'rgba(255,193,7,0.12)';
              e.currentTarget.style.color = darkMode ? '#ffffff' : '#1a1a1a';
            }
          }}
          onMouseOut={(e) => {
            if (!anyChildActive) {
              e.currentTarget.style.background = anyChildActive ? 'linear-gradient(135deg, rgba(255,193,7,0.15) 0%, rgba(255,179,0,0.15) 100%)' : 'transparent';
              e.currentTarget.style.color = anyChildActive ? '#ffc107' : (darkMode ? '#bbbbbb' : '#333333');
            }
          }}
          title={collapsed ? link.label : undefined}
        >
          <i className={`fas ${link.icon}`} style={{
            fontSize: '0.95rem',
            width: '18px',
            textAlign: 'center',
            flexShrink: 0,
            color: anyChildActive ? '#ffc107' : (darkMode ? '#888888' : '#666666'),
          }} />
          {!collapsed && (
            <>
              <span style={{ flex: 1, letterSpacing: '0.01em' }}>{link.label}</span>
              <i
                className={`fas fa-chevron-${isOpen ? 'up' : 'down'}`}
                style={{
                  fontSize: '0.65rem',
                  color: darkMode ? '#666' : '#aaa',
                  transition: 'transform 0.25s',
                  transform: isOpen ? 'rotate(0deg)' : 'rotate(0deg)',
                }}
              />
            </>
          )}
        </div>

        {/* Children drawer */}
        {!collapsed && isOpen && (
          <div style={{
            marginLeft: '1.25rem',
            marginBottom: '4px',
            borderLeft: `2px solid ${darkMode ? 'rgba(255,193,7,0.2)' : 'rgba(255,193,7,0.3)'}`,
            paddingLeft: '0.5rem',
            overflow: 'hidden',
            animation: 'dropdownFadeIn 0.2s ease forwards',
          }}>
            {link.children?.map((child, cIdx) => {
              const childActive = isActive(child.to);
              return (
                <Link
                  key={cIdx}
                  to={child.to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '10px',
                    marginBottom: '2px',
                    textDecoration: 'none',
                    background: childActive
                      ? 'linear-gradient(135deg, #ffc107 0%, #ffb300 100%)'
                      : 'transparent',
                    color: childActive ? '#1a1a1a' : (darkMode ? '#bbbbbb' : '#444444'),
                    fontWeight: childActive ? '700' : '500',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
                    boxShadow: childActive ? '0 3px 10px rgba(255,193,7,0.3)' : 'none',
                  }}
                  onClick={() => setMobileOpen(false)}
                  onMouseOver={(e) => {
                    if (!childActive) {
                      e.currentTarget.style.background = darkMode ? 'rgba(255,193,7,0.1)' : 'rgba(255,193,7,0.1)';
                      e.currentTarget.style.color = darkMode ? '#fff' : '#1a1a1a';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!childActive) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = darkMode ? '#bbbbbb' : '#444444';
                    }
                  }}
                >
                  <i className={`fas ${child.icon}`} style={{
                    fontSize: '0.82rem',
                    width: '16px',
                    textAlign: 'center',
                    color: childActive ? '#1a1a1a' : (darkMode ? '#888' : '#777'),
                  }} />
                  <span>{child.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const active = link.to ? isActive(link.to) : false;
  const commonStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: collapsed ? 0 : '0.75rem',
    padding: collapsed ? '0.75rem' : '0.7rem 1rem',
    borderRadius: '12px',
    marginBottom: '3px',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
    background: active
      ? 'linear-gradient(135deg, #ffc107 0%, #ffb300 100%)'
      : 'transparent',
    color: active ? '#1a1a1a' : (darkMode ? '#bbbbbb' : '#333333'),
    fontWeight: active ? '700' : '500',
    fontSize: '0.875rem',
    textDecoration: 'none',
    justifyContent: collapsed ? 'center' : 'flex-start',
    position: 'relative',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    boxShadow: active ? '0 4px 14px rgba(255,193,7,0.35)' : 'none',
  };

  const iconStyle = {
    fontSize: '0.95rem',
    width: '18px',
    textAlign: 'center',
    flexShrink: 0,
    color: active ? '#1a1a1a' : (darkMode ? '#888888' : '#666666'),
    transition: 'color 0.2s',
  };

  const handleMouseOver = (e) => {
    if (!active) {
      e.currentTarget.style.background = darkMode ? 'rgba(255,193,7,0.1)' : 'rgba(255,193,7,0.12)';
      e.currentTarget.style.color = darkMode ? '#ffffff' : '#1a1a1a';
    }
  };
  const handleMouseOut = (e) => {
    if (!active) {
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.color = darkMode ? '#bbbbbb' : '#333333';
    }
  };

  const icon = <i className={`fas ${link.icon}`} style={iconStyle} />;

  const content = (
    <>
      {icon}
      {!collapsed && <span style={{ flex: 1, letterSpacing: '0.01em' }}>{link.label}</span>}
      {!collapsed && link.badge > 0 && (
        <span style={{
          background: '#ef4444',
          color: '#fff',
          borderRadius: '999px',
          fontSize: '0.6rem',
          fontWeight: '700',
          padding: '0.1rem 0.42rem',
          minWidth: '17px',
          textAlign: 'center',
          lineHeight: '1.4',
          flexShrink: 0,
        }}>
          {link.badge > 9 ? '9+' : link.badge}
        </span>
      )}
    </>
  );

  if (link.to) {
    return (
      <Link
        key={idx}
        to={link.to}
        style={commonStyle}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        onClick={() => setMobileOpen(false)}
        title={collapsed ? link.label : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      key={idx}
      style={commonStyle}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
      onClick={link.action}
      title={collapsed ? link.label : undefined}
    >
      {content}
    </div>
  );
};

  // ─── Sidebar inner content ───────────────────────────────────────────────
  const sidebarContent = (isMobile = false) => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        padding: '0',
      }}
    >
      {/* ── Logo + Collapse btn ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed && !isMobile ? 'center' : 'space-between',
          padding: '1.1rem 1rem 1rem',
          borderBottom: `1px solid ${border}`,
          flexShrink: 0,
        }}
      >
        {(!collapsed || isMobile) && (
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              textDecoration: 'none',
              flex: 1,
              overflow: 'hidden',
            }}
          >
            <img
              src="/logo.png"
              alt="Logo"
              style={{ width: '36px', height: '36px', objectFit: 'contain', flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(255,193,7,0.4))' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            <span style={{ fontWeight: '700', fontSize: '1.2rem', whiteSpace: 'nowrap' }}>
              <span style={{ color: '#ffc107' }}>Pet</span>
              <span style={{ color: textColor }}>Unity</span>
            </span>
          </Link>
        )}

        {collapsed && !isMobile && (
          <img
            src="/logo.png"
            alt="Logo"
            style={{ width: '32px', height: '32px', objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(255,193,7,0.4))' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}

        {!isMobile && (
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0.3rem',
              borderRadius: '8px',
              color: darkMode ? '#666' : '#aaa',
              transition: 'all 0.2s',
              flexShrink: 0,
              marginLeft: collapsed ? 0 : '0.3rem',
            }}
            onMouseOver={(e) => { e.currentTarget.style.color = '#ffc107'; e.currentTarget.style.background = 'rgba(255,193,7,0.1)'; }}
            onMouseOut={(e) => { e.currentTarget.style.color = darkMode ? '#666' : '#aaa'; e.currentTarget.style.background = 'transparent'; }}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <i className={`fas ${collapsed ? 'fa-chevron-right' : 'fa-chevron-left'}`} style={{ fontSize: '0.75rem' }} />
          </button>
        )}
      </div>

      {/* ── Nav links — scrollable, never pushes bottom out ── */}
      <nav style={{
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  padding: '1rem 0.5rem 0.75rem',
  scrollbarWidth: 'none',
  minHeight: 0
}}>
  {!collapsed && role && (
    <div style={{ padding: '0 0.6rem', marginBottom: '0.5rem' }}>
      <span style={{
        fontSize: '0.62rem',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: darkMode ? '#333333' : '#cccccc',
      }}>
        Menu
      </span>
    </div>
  )}
  {links.map((link, idx) => renderLink(link, idx))}
</nav>

      {/* ── Bottom section — empty, no profile/dark mode here anymore ── */}
      <div style={{ flexShrink: 0 }} />
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .sidebar-scroll::-webkit-scrollbar { display: none; }
        nav::-webkit-scrollbar { display: none; }
        @media (max-width: 991px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-spacer  { display: none !important; }
          .sidebar-bottom-bar { display: flex !important; }
          .top-navbar-bar { left: 0 !important; top: 0 !important; height: 56px !important; padding-right: 0.75rem !important; gap: 0.4rem !important; }
          .flex-grow-1 main, main.flex-grow-1 { padding-bottom: 64px !important; }
          .sidebar-mobile-toggle { display: none !important; }
          .navbar-toggler { display: none !important; }
          .modal { zoom: 0.75 !important; }
          .profile-pill { padding: 0.25rem 0.5rem !important; gap: 0.3rem !important; }
          .profile-pill > div:first-child { width: 22px !important; height: 22px !important; }
          .profile-pill > div:first-child i { font-size: 0.55rem !important; }
          .profile-pill > div:first-child > div:last-child { width: 6px !important; height: 6px !important; }
          .profile-pill > div:nth-child(2) > div:first-child { font-size: 0.7rem !important; }
          .profile-pill > div:nth-child(2) > div:last-child { font-size: 0.55rem !important; }
          .profile-pill > i:last-child { display: none !important; }
          .landing-brand { display: none !important; }
          .landing-register-btn { display: none !important; }
          .landing-nav-label { display: none !important; }
          .landing-nav-icon { font-size: 1.1rem !important; margin: 0 !important; }
          .landing-nav-links { display: none !important; }
          .navbar-mobile-brand { display: flex !important; }
          .profile-dropdown-menu { zoom: 0.82 !important; min-width: 190px !important; right: -0.25rem !important; }
          .logout-modal-body { padding: 1.75rem !important; }
          .logout-modal-body h5 { font-size: 1.1rem !important; }
          .logout-modal-body p { font-size: 0.88rem !important; }
          .logout-modal-body .btn { padding: 0.55rem 1.1rem !important; font-size: 0.85rem !important; min-width: 100px !important; }
          .logout-modal-icon { width: 64px !important; height: 64px !important; margin-bottom: 0.85rem !important; }
          .logout-modal-icon img { width: 32px !important; height: 32px !important; }
        }
        @media (min-width: 992px) {
          .sidebar-mobile-overlay { display: none !important; }
          .sidebar-mobile-toggle  { display: none !important; }
          .sidebar-bottom-bar { display: none !important; }
          .qr-scanner-icon { display: none !important; }
        }
        @keyframes sidebarSlideOut {
          0%   { opacity: 1; transform: translateX(0); }
          100% { opacity: 0; transform: translateX(-30px); }
        }
        @keyframes sidebarSlideIn {
          0%   { opacity: 0; transform: translateX(-30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes mobileNavSlideOut {
          0%   { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(30px); }
        }
        @keyframes mobileNavSlideIn {
          0%   { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes mobileTopSlideOut {
          0%   { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-30px); }
        }
        @keyframes mobileTopSlideIn {
          0%   { opacity: 0; transform: translateY(-30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .sidebar-slide-out {
          animation: sidebarSlideOut 0.28s cubic-bezier(0.4,0,0.2,1) forwards;
        }
        .sidebar-slide-in {
          animation: sidebarSlideIn 0.32s cubic-bezier(0.4,0,0.2,1) forwards;
        }
        .mobile-nav-slide-out {
          animation: mobileNavSlideOut 0.28s cubic-bezier(0.4,0,0.2,1) forwards;
        }
        .mobile-nav-slide-in {
          animation: mobileNavSlideIn 0.32s cubic-bezier(0.4,0,0.2,1) forwards;
        }
        .mobile-top-slide-out {
          animation: mobileTopSlideOut 0.28s cubic-bezier(0.4,0,0.2,1) forwards;
        }
        .mobile-top-slide-in {
          animation: mobileTopSlideIn 0.32s cubic-bezier(0.4,0,0.2,1) forwards;
        }
          @keyframes dropdownFadeIn {
  0% {
    opacity: 0;
    transform: translateY(-16px);
    max-height: 0;
  }
  100% {
    opacity: 1;
    transform: translateY(0);
    max-height: 500px;
  }
}
@keyframes dropdownFadeOut {
  0% {
    opacity: 1;
    transform: translateY(0);
    max-height: 500px;
  }
  100% {
    opacity: 0;
    transform: translateY(-16px);
    max-height: 0;
  }
}
    .modal { z-index: 99999 !important; }
        .modal-backdrop { z-index: 99998 !important; }
        @keyframes scanSuccess {
          0%   { transform: scale(0.5); opacity: 0; }
          50%  { transform: scale(1.15); opacity: 1; }
          75%  { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes scanLine {
          0%   { top: 0%; opacity: 1; }
          50%  { top: 100%; opacity: 1; }
          100% { top: 0%; opacity: 1; }
        }
        @keyframes scanPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(255,193,7,0.5); }
          50%      { box-shadow: 0 0 0 14px rgba(255,193,7,0); }
        }
        @keyframes scanError {
          0%   { transform: scale(0.5); opacity: 0; }
          50%  { transform: scale(1.15); opacity: 1; }
          75%  { transform: scale(0.95); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%     { transform: translateX(-8px); }
          40%     { transform: translateX(8px); }
          60%     { transform: translateX(-6px); }
          80%     { transform: translateX(6px); }
        }
        .scan-error-overlay {
          animation: scanError 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        .scan-error-icon {
          animation: shake 0.5s ease-in-out 0.3s;
        }
        .scan-success-overlay {
          animation: scanSuccess 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        .scan-line {
          position: absolute;
          left: 8px; right: 8px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #ffc107, transparent);
          animation: scanLine 1.8s ease-in-out infinite;
          box-shadow: 0 0 8px rgba(255,193,7,0.8);
        }
      ` }} />

      {/* ── Top Navbar Profile Bar ── */}
      {!isLandingPage && user && (
        <div className={`top-navbar-bar ${mobileTopAnim}`} style={{
          position: 'fixed',
          top: 0,
          left: sidebarWidth,
          right: 0,
          height: '56px',
          background: darkMode ? 'rgba(13,13,13,0.95)' : 'rgba(255,255,255,0.95)',
          borderBottom: `1px solid ${border}`,
          backdropFilter: 'blur(12px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '1.5rem',
          gap: '0.75rem',
          transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)',
          boxShadow: darkMode ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          {/* Logo — mobile only */}
          <div className="navbar-mobile-brand" style={{ display: 'none', alignItems: 'center', gap: '0.4rem', flex: 1, paddingLeft: '0.75rem' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '26px', height: '26px', objectFit: 'contain', filter: 'drop-shadow(0 0 4px rgba(255,193,7,0.4))' }} onError={e => e.target.style.display = 'none'} />
            <span style={{ fontWeight: '700', fontSize: '1rem' }}>
              <span style={{ color: '#ffc107' }}>Pet</span>
              <span style={{ color: textColor }}>Unity</span>
            </span>
          </div>

          

          {/* QR Scanner — mobile only, non-super_admin only */}
          {user?.role !== 'super_admin' && (
            <>
              <img
                src="/scanner.png"
                alt="QR Scanner"
                className="qr-scanner-icon"
                style={{ width: '20px', height: '20px', objectFit: 'contain', cursor: 'pointer', opacity: 0.6, transition: 'opacity 0.2s' }}
                onClick={() => setShowScannerModal(true)}
                onMouseOver={e => e.currentTarget.style.opacity = '1'}
                onMouseOut={e => e.currentTarget.style.opacity = '0.6'}
              />

              {/* QR Scanner Modal */}
              <Modal
                show={showScannerModal}
                onHide={() => setShowScannerModal(false)}
                centered
                size="sm"
                style={{ zIndex: 99999 }}
              >
                <Modal.Header closeButton style={{ background: '#f8f9fa', borderBottom: '2px solid #ffc107' }}>
                  <Modal.Title style={{ fontWeight: '700', fontSize: '1rem' }}>
                    <i className="fas fa-qrcode me-2" style={{ color: '#ffc107' }} />
                    Scan Pet QR Code
                  </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ padding: '1.5rem', maxHeight: '75vh', overflowY: 'auto' }}>
                  {scanResult ? (
                    (() => {
                      try {
                        const data = JSON.parse(scanResult);
                        const speciesIcon = data.species?.toLowerCase() === 'dog' ? '/dog.png' : data.species?.toLowerCase() === 'cat' ? '/cat.png' : data.species?.toLowerCase() === 'rabbit' ? '/rabbit.png' : '/dog.png';
                        const rows = [
                          { label: 'Registration No.', value: data.reg_no },
                          { label: 'Species',          value: data.species },
                          { label: 'Breed',            value: data.breed },
                          { label: 'Gender',           value: data.gender },
                          { label: 'Birth Date',       value: data.birth_date },
                          { label: 'Color',            value: data.color },
                          { label: 'Weight',           value: data.weight && data.weight !== 'N/A' ? `${data.weight} kg` : null },
                          { label: 'Sterilized',       value: data.sterilized },
                          { label: 'Microchip No.',    value: data.microchip },
                          { label: 'Owner',            value: data.owner },
                          { label: 'Owner Phone',      value: data.owner_phone },
                          { label: 'Barangay',         value: data.barangay },
                          { label: 'Issued By',        value: data.issued_by },
                        ].filter(r => r.value && r.value !== 'N/A' && r.value !== 'null' && r.value !== 'Unknown');
                        return (
                          <div>
                            {/* Pet header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)', borderRadius: '12px', marginBottom: '1rem', borderBottom: '2px solid #ffc107' }}>
                              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', flexShrink: 0 }}>
                                <img src={speciesIcon} alt={data.species} style={{ width: '32px', height: '32px', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
                              </div>
                              <div>
                                <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#333' }}>{data.name}</div>
                                <div style={{ fontSize: '0.72rem', color: '#888', fontWeight: '600', textTransform: 'capitalize' }}>{data.species}</div>
                              </div>
                              <div style={{ marginLeft: 'auto' }}>
                                <span style={{ background: 'rgba(25,135,84,0.1)', border: '1px solid rgba(25,135,84,0.3)', color: '#198754', borderRadius: '999px', fontSize: '0.65rem', fontWeight: '700', padding: '0.2rem 0.6rem' }}>
                                  <i className="fas fa-check-circle me-1" />Verified
                                </span>
                              </div>
                            </div>

                            {/* Details table */}
                            <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #f0f0f0', overflow: 'hidden', marginBottom: '1rem' }}>
                              {rows.map((row, i) => (
                                <div key={row.label} style={{ display: 'flex', borderBottom: i < rows.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                                  <div style={{ width: '130px', flexShrink: 0, padding: '0.55rem 0.75rem', fontWeight: '600', color: '#888', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', background: '#fafafa' }}>{row.label}</div>
                                  <div style={{ flex: 1, padding: '0.55rem 0.75rem', fontWeight: '600', color: '#333', fontSize: '0.82rem', textTransform: ['Species','Gender','Sterilized'].includes(row.label) ? 'capitalize' : 'none' }}>{row.value}</div>
                                </div>
                              ))}
                            </div>

                            <Button
                              onClick={() => setScanResult('')}
                              style={{ background: '#ffc107', border: 'none', color: '#000', borderRadius: '8px', fontWeight: '700', width: '100%' }}
                            >
                              <i className="fas fa-redo me-2" />Scan Again
                            </Button>
                          </div>
                        );
                      } catch {
                        return (
                          <div>
                            <div style={{ background: 'rgba(220,53,69,0.07)', border: '1.5px solid rgba(220,53,69,0.3)', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#dc3545' }}>
                              <i className="fas fa-exclamation-triangle me-2" />Could not read QR code data.
                            </div>
                            <Button onClick={() => setScanResult('')} style={{ background: '#ffc107', border: 'none', color: '#000', borderRadius: '8px', fontWeight: '700', width: '100%' }}>
                              <i className="fas fa-redo me-2" />Scan Again
                            </Button>
                          </div>
                        );
                      }
                    })()
                  ) : (
                    <div>
                      <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: '1rem', textAlign: 'center' }}>
                        Point your camera at a pet's microchip QR code.
                      </p>

                      {/* Scanner + overlays — scanner div always stays mounted */}
                      <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', minHeight: '260px' }}>
                        <div id="qr-reader" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden' }} />
                        <div className="scan-line" style={{ display: scanSucess || scanError ? 'none' : 'block' }} />
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: '12px',
                          border: `3px solid ${scanError ? 'rgba(220,53,69,0.6)' : 'rgba(255,193,7,0.6)'}`,
                          pointerEvents: 'none',
                          animation: 'scanPulse 2s ease-in-out infinite',
                          transition: 'border-color 0.3s',
                        }} />

                        {/* Success overlay */}
                        {scanSucess && (
                          <div className="scan-success-overlay" style={{
                            position: 'absolute', inset: 0, borderRadius: '12px',
                            background: 'rgba(255,255,255,0.96)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                          }}>
                            <div style={{
                              width: '72px', height: '72px', borderRadius: '50%',
                              background: 'linear-gradient(135deg, #ffc107, #ffb300)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              animation: 'scanPulse 0.8s ease-in-out 2',
                              boxShadow: '0 8px 24px rgba(255,193,7,0.4)',
                            }}>
                              <i className="fas fa-check" style={{ fontSize: '2rem', color: '#fff' }} />
                            </div>
                            <div style={{ fontWeight: '800', fontSize: '1rem', color: '#333' }}>Scan Complete!</div>
                            <div style={{ fontSize: '0.75rem', color: '#888' }}>Loading pet information...</div>
                            <Spinner animation="border" size="sm" style={{ color: '#ffc107' }} />
                          </div>
                        )}

                        {/* Error overlay */}
                        {scanError && (
                          <div className="scan-error-overlay" style={{
                            position: 'absolute', inset: 0, borderRadius: '12px',
                            background: 'rgba(255,255,255,0.96)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                            padding: '1rem',
                          }}>
                            <div className="scan-error-icon" style={{
                              width: '72px', height: '72px', borderRadius: '50%',
                              background: 'linear-gradient(135deg, #dc3545, #b02a37)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 8px 24px rgba(220,53,69,0.4)',
                            }}>
                              <i className="fas fa-times" style={{ fontSize: '2rem', color: '#fff' }} />
                            </div>
                            <div style={{ fontWeight: '800', fontSize: '1rem', color: '#333' }}>Not Recognized</div>
                            <div style={{ fontSize: '0.75rem', color: '#888', textAlign: 'center', lineHeight: 1.5 }}>
                              Not a registered pet microchip QR code.
                            </div>
                            <div style={{ background: 'rgba(220,53,69,0.07)', border: '1.5px solid rgba(220,53,69,0.2)', borderRadius: '8px', padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%' }}>
                              <i className="fas fa-info-circle" style={{ color: '#dc3545', fontSize: '0.78rem', flexShrink: 0 }} />
                              <span style={{ fontSize: '0.7rem', color: '#dc3545', fontWeight: '600' }}>Resuming scanner automatically...</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <p style={{ fontSize: '0.72rem', color: '#bbb', marginTop: '0.75rem', textAlign: 'center' }}>
                        <i className="fas fa-lightbulb me-1" style={{ color: '#ffc107' }} />
                        Make sure the QR code is well lit and in frame
                      </p>
                    </div>
                  )}
                </Modal.Body>
              </Modal>
            </>
          )}

          {/* Profile pill */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => {
                if (dropdownOpenRef.current) {
                  closeDropdown();
                } else {
                  dropdownOpenRef.current = true;
                  setShowProfileDropdown(true);
                }
              }}
              className="profile-pill"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.4rem 0.75rem',
                borderRadius: '999px',
                background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                border: `1px solid ${border}`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                userSelect: 'none',
              }}
              onMouseOver={e => e.currentTarget.style.background = darkMode ? 'rgba(255,193,7,0.1)' : 'rgba(255,193,7,0.08)'}
              onMouseOut={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
            >
              {/* Avatar */}
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: darkMode ? '#222' : '#f0f0f0',
                border: `1.5px solid ${border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative', flexShrink: 0,
              }}>
                <i className="fas fa-user" style={{ fontSize: '0.75rem', color: darkMode ? '#bbb' : '#555' }} />
                <div style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: '8px', height: '8px', background: '#22c55e',
                  borderRadius: '50%', border: `2px solid ${darkMode ? '#0d0d0d' : '#fff'}`,
                }} />
              </div>

              {/* Name + role */}
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: textColor, whiteSpace: 'nowrap' }}>
  {user.role === 'super_admin' ? 'Super Admin' : user.role === 'private_clinic' ? (user.clinic_name || `${user.first_name} ${user.last_name}`) : `${user.first_name} ${user.last_name}`}

</div>
                {(() => {
                  const rc = { super_admin: { name: 'Super Admin', color: '#ef4444' }, barangay_official: { name: user.office_role || 'Barangay Admin', color: '#ffc107' }, pet_owner: { name: 'Community', color: '#22c55e' }, private_clinic: { name: 'Private Clinic', color: '#22c55e' } };
                  const r = rc[user.role];
                  return r ? <div style={{ fontSize: '0.65rem', fontWeight: '600', color: r.color, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{r.name}</div> : null;
                })()}
              </div>

              <i className={`fas fa-chevron-${showProfileDropdown ? 'up' : 'down'}`} style={{ fontSize: '0.65rem', color: subTextColor, marginLeft: '0.2rem' }} />
            </div>

            {/* Dropdown */}
            {(showProfileDropdown || dropdownClosing) && (
              <>
                <div 
  onClick={() => closeDropdown()} 
  style={{ 
    position: 'fixed', 
    inset: 0, 
    zIndex: 10000,
    background: 'transparent',
    cursor: 'default'
  }} 
/>
                <div className="profile-dropdown-menu" style={{
                  position: 'absolute',
                  top: 'calc(100% + 0.5rem)',
                  right: 0,
                  background: darkMode ? '#1a1a1a' : '#ffffff',
                  border: `1px solid ${border}`,
                  borderRadius: '14px',
                  boxShadow: darkMode ? '0 8px 32px rgba(0,0,0,0.5)' : '0 8px 32px rgba(0,0,0,0.12)',
                  minWidth: '220px',
                  zIndex: 10001,
                  padding: '0.5rem',
                  animation: `${dropdownClosing ? 'dropdownFadeOut' : 'dropdownFadeIn'} 0.2s cubic-bezier(0.4,0,0.2,1) forwards`,
                  transformOrigin: 'top center',
                  overflow: 'hidden',
                }}>
                  {/* User info header */}
                  <div style={{ padding: '0.6rem 0.75rem 0.75rem', borderBottom: `1px solid ${border}`, marginBottom: '0.4rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: '700', color: textColor, whiteSpace: 'nowrap' }}>
  {user.role === 'super_admin' ? 'Super Admin' : user.role === 'private_clinic' ? (user.clinic_name || `${user.first_name} ${user.last_name}`) : `${user.first_name} ${user.last_name}`}

</div>
                    <div style={{ fontSize: '0.7rem', color: subTextColor, marginTop: '0.15rem' }}>{user.email}</div>
{(() => {
  const rc = { super_admin: { name: 'Super Admin', color: '#ef4444' }, barangay_official: { name: user.office_role || 'Barangay Admin', color: '#ffc107' }, pet_owner: { name: 'Community', color: '#22c55e' }, private_clinic: { name: 'Private Clinic', color: '#22c55e' } };
  const r = rc[user.role];
  return r ? (
    <div style={{ marginTop: '0.3rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: r.color + '18', border: `1px solid ${r.color}44`, borderRadius: '50px', padding: '0.15rem 0.6rem' }}>
      <i className="fas fa-shield-alt" style={{ fontSize: '0.55rem', color: r.color }} />
      <span style={{ fontSize: '0.62rem', fontWeight: '700', color: r.color, textTransform: 'uppercase' }}>{r.name}</span>
    </div>
  ) : null;
})()}

                    {/* Verification status for pet_owner */}
                    {user.role === 'pet_owner' && ownerProfile && (() => {
                      const cfg = VERIFICATION_CONFIG[ownerProfile.verification_status] || VERIFICATION_CONFIG.not_verified;
                      return (
                        <div style={{ marginTop: '0.4rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', background: cfg.color + '18', border: `1px solid ${cfg.color}44`, borderRadius: '50px', padding: '0.15rem 0.6rem' }}>
                          <i className={`fas ${cfg.icon}`} style={{ fontSize: '0.55rem', color: cfg.color }} />
                          <span style={{ fontSize: '0.62rem', fontWeight: '700', color: cfg.color, textTransform: 'uppercase' }}>{cfg.label}</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Dark mode toggle inside dropdown */}
                  <div
                    onClick={() => { const n = !darkMode; setDarkMode(n); localStorage.setItem('darkMode', n); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      marginBottom: '0.2rem',
                    }}
                    onMouseOver={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <i
                      className={`fas ${darkMode ? 'fa-moon' : 'fa-sun'}`}
                      style={{ fontSize: '0.78rem', color: darkMode ? '#a0c4ff' : '#ffc107', width: '16px', textAlign: 'center' }}
                    />
                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: textColor, flex: 1 }}>
                      {darkMode ? 'Dark Mode' : 'Light Mode'}
                    </span>
                    {/* Animated toggle */}
                    <div style={{
                      width: '36px',
                      height: '20px',
                      borderRadius: '999px',
                      background: darkMode ? '#4361ee' : '#e0e0e0',
                      position: 'relative',
                      flexShrink: 0,
                      transition: 'background 0.3s ease',
                      border: `1px solid ${darkMode ? '#3451d1' : '#ccc'}`,
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        left: darkMode ? '18px' : '2px',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <i
                          className={`fas ${darkMode ? 'fa-moon' : 'fa-sun'}`}
                          style={{
                            fontSize: '0.4rem',
                            color: darkMode ? '#4361ee' : '#ffc107',
                            pointerEvents: 'none',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{ height: '1px', background: border, margin: '0.2rem 0' }} />

                  {/* Verify Account button for pet_owner */}
                  {user.role === 'pet_owner' && ownerProfile && (() => {
                    const canVerify = ownerProfile.verification_status === 'not_verified' || ownerProfile.verification_status === 'semi_verified';
                    return canVerify ? (
                      <button
                        onClick={() => { closeDropdown(); handleOpenVerifyModal(); }}
                        style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'transparent', border: 'none', borderRadius: '8px', color: '#ffc107', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s', marginBottom: '0.2rem' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,193,7,0.08)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <i className="fas fa-id-card" style={{ fontSize: '0.75rem' }} />
                        Verify Account
                      </button>
                    ) : null;
                  })()}

                  {/* Edit Profile */}
                  {(user.role === 'barangay_official' || user.role === 'pet_owner' || user.role === 'private_clinic') && (
                    <button
                      onClick={() => {
                        closeDropdown();
                        setSidebarAnim('sidebar-slide-out');
                        setMobileNavAnim('mobile-nav-slide-out');
                        setMobileTopAnim('mobile-top-slide-out');
                        setTimeout(() => {
                          navigate('/edit-profile', { state: { from: location.pathname } });
                        }, 260);
                      }}
                      style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'transparent', border: 'none', borderRadius: '8px', color: textColor, fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s', marginBottom: '0.2rem' }}
                      onMouseOver={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}
                      onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <i className="fas fa-user-edit" style={{ fontSize: '0.75rem', width: '16px', textAlign: 'center' }} />
                      Edit Profile
                    </button>
                  )}

                  {/* Sign out */}
                  <button
                    onClick={() => { closeDropdown(); setShowLogoutModal(true); }}
                    style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'transparent', border: 'none', borderRadius: '8px', color: '#ef4444', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(239,68,68,0.07)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <i className="fas fa-sign-out-alt" style={{ fontSize: '0.75rem' }} />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Spacer that pushes main content to the right of the fixed sidebar */}
      {!isLandingPage && (
        <div
          className="sidebar-spacer"
          style={{
            width: sidebarWidth,
            flexShrink: 0,
            transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      )}
      

      {/* ── Desktop Sidebar — fixed so bottom section never scrolls away ── */}
      <div
        className={`sidebar-desktop ${sidebarAnim}`}
        style={{
          width: sidebarWidth,
          height: '100vh',
          background: bg,
          borderRight: `1px solid ${border}`,
          position: 'fixed',
          top: 0,
          left: 0,
          flexShrink: 0,
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
          zIndex: 10000,
          boxShadow: darkMode
            ? '2px 0 20px rgba(0,0,0,0.4)'
            : '2px 0 20px rgba(0,0,0,0.06)',
        }}
      >
        {sidebarContent(false)}
      </div>

      

      {/* ── Mobile toggle button (hidden — replaced by bottom nav) ── */}

      {/* ── Bottom Nav Bar (mobile only) ── */}
      {!isLandingPage && user && (
        <div
          className={`sidebar-bottom-bar ${mobileNavAnim}`}
        style={{
          display: 'none',
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '56px',
            background: darkMode ? '#111111' : '#ffffff',
            borderTop: `1px solid ${border}`,
            zIndex: 10000,
            alignItems: 'center',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
            boxShadow: darkMode ? '0 -2px 12px rgba(0,0,0,0.3)' : '0 -2px 12px rgba(0,0,0,0.06)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <style>{`.sidebar-bottom-bar::-webkit-scrollbar { display: none; }`}</style>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0',
            minWidth: 'max-content',
            padding: '0 0.5rem',
            height: '100%',
          }}>
            {links.flatMap((link, idx) => {
              if (link.dropdown) {
                return (link.children || []).map((child, cIdx) => ({
                  ...child,
                  _key: `${idx}-${cIdx}`
                }));
              }
              return [{ ...link, _key: String(idx) }];
            }).map((link) => {
              const active = link.to ? isActive(link.to) : false;
              const inner = (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '2px',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: active ? 'rgba(255,193,7,0.15)' : 'transparent',
                  transition: 'background 0.2s',
                  position: 'relative',
                  minWidth: '56px',
                }}>
                  <i className={`fas ${link.icon}`} style={{
                    fontSize: '1.1rem',
                    color: active ? '#ffc107' : (darkMode ? '#888' : '#666'),
                  }} />
                  <span style={{
                    fontSize: '0.6rem',
                    fontWeight: active ? '700' : '500',
                    color: active ? '#ffc107' : (darkMode ? '#888' : '#666'),
                    whiteSpace: 'nowrap',
                  }}>{link.label}</span>
                  {link.badge > 0 && (
                    <span style={{
                      position: 'absolute',
                      top: '2px',
                      right: '6px',
                      background: '#ef4444',
                      color: '#fff',
                      borderRadius: '999px',
                      fontSize: '0.5rem',
                      fontWeight: '700',
                      padding: '0.08rem 0.32rem',
                      minWidth: '14px',
                      textAlign: 'center',
                      lineHeight: '1.5',
                    }}>
                      {link.badge > 9 ? '9+' : link.badge}
                    </span>
                  )}
                </div>
              );
              return link.to ? (
                <Link key={link._key} to={link.to} style={{ textDecoration: 'none' }}>{inner}</Link>
              ) : (
                <div key={link._key} onClick={link.action}>{inner}</div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Mobile Overlay ── */}
      {mobileOpen && (
        <div
          className="sidebar-mobile-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex' }}
        >
          {/* Backdrop */}
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div
            style={{
              position: 'relative',
              width: '256px',
              height: '100%',
              background: bg,
              borderRight: `1px solid ${border}`,
              zIndex: 1,
              overflowY: 'auto',
            }}
          >
            {sidebarContent(true)}
          </div>
        </div>
      )}

      {/* ── Verification Modal ── */}
      {user?.role === 'pet_owner' && (
        <Modal show={showVerifyModal} onHide={() => !verifySubmitting && setShowVerifyModal(false)} size="lg" backdrop="static" style={{ zoom:'0.75', zIndex: 99999 }}>
          <Modal.Header closeButton={!verifySubmitting} style={{ background:'linear-gradient(135deg,#f8f9fa,#e9ecef)', borderBottom:'2px solid #ffc107', borderRadius:'20px 20px 0 0' }}>
            <Modal.Title style={{ fontWeight:'800', color:'#333' }}>
              <i className="fas fa-id-card me-2" style={{ color:'#ffc107' }} />
              {verifyStep === 1 ? 'Step 1 of 2 — Confirm Your Profile' : 'Step 2 of 2 — Upload Valid ID'}
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
            {verifySuccess && (
              <Alert variant="success" className="mb-3" style={{ borderRadius:'12px', border:'2px solid rgba(25,135,84,0.25)', background:'rgba(25,135,84,0.07)', color:'#1a1a1a', fontSize:'0.875rem' }}>
                <i className="fas fa-check-circle me-2" style={{ color:'#198754' }} />{verifySuccess}
              </Alert>
            )}

            {/* Step 1 */}
            {verifyStep === 1 && (() => {
              const ls = { fontWeight:'600', color:'#1a1a1a', fontSize:'0.875rem', marginBottom:'0.4rem', display:'flex', alignItems:'center' };
              const es = { borderRadius:'10px', padding:'0.65rem 0.9rem', border:'2px solid #dee2e6', background:'#f8f9fa', color:'#1a1a1a', fontWeight:'500', fontSize:'0.9rem', transition:'all 0.2s' };
              const Req = () => <span style={{ color:'#ef4444', marginLeft:'2px' }}>*</span>;
              return (
                <>
                  <div style={{ background:'rgba(255,193,7,0.06)', border:'1.5px dashed #ffc107', borderRadius:'12px', padding:'0.85rem 1rem', marginBottom:'1.5rem', fontSize:'0.85rem', color:'#666' }}>
                    <i className="fas fa-info-circle me-2" style={{ color:'#ffc107' }} />
                    Review and update your personal information. <strong style={{ color:'#1a1a1a' }}>Email cannot be changed.</strong>
                  </div>
                  <Form.Group className="mb-3">
                    <Form.Label style={ls}><i className="fas fa-envelope me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Email Address</Form.Label>
                    <Form.Control type="email" value={ownerProfile?.email || ''} readOnly style={{ ...es, background:'#e9ecef', color:'#6c757d', cursor:'not-allowed' }} />
                    <small style={{ color:'#9ca3af', fontSize:'0.8rem' }}><i className="fas fa-lock me-1" />Email cannot be changed</small>
                  </Form.Group>
                  <Row>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label style={ls}><i className="fas fa-user me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />First Name <Req /></Form.Label><Form.Control type="text" name="first_name" value={profileForm.first_name} onChange={handleProfileFormChange} onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }} onBlur={(e) => { if (e.target.value.endsWith('-')) setProfileFieldErrors(prev => ({ ...prev, first_name: 'Cannot end with a hyphen' })); }} placeholder="First name" disabled={verifySubmitting} style={{ ...es, border: profileFieldErrors.first_name ? '2px solid #ef4444' : es.border }} />{profileFieldErrors.first_name && <small style={{ color:'#ef4444', display:'block', marginTop:'0.3rem', fontSize:'0.78rem' }}><i className="fas fa-times-circle me-1" />{profileFieldErrors.first_name}</small>}</Form.Group></Col>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label style={ls}><i className="fas fa-user me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Middle Name</Form.Label><Form.Control type="text" name="middle_name" value={profileForm.middle_name} onChange={handleProfileFormChange} onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }} onBlur={(e) => { if (e.target.value.endsWith('-')) setProfileFieldErrors(prev => ({ ...prev, middle_name: 'Cannot end with a hyphen' })); }} placeholder="Optional" disabled={verifySubmitting} style={{ ...es, border: profileFieldErrors.middle_name ? '2px solid #ef4444' : es.border }} />{profileFieldErrors.middle_name && <small style={{ color:'#ef4444', display:'block', marginTop:'0.3rem', fontSize:'0.78rem' }}><i className="fas fa-times-circle me-1" />{profileFieldErrors.middle_name}</small>}</Form.Group></Col>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label style={ls}><i className="fas fa-user me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Last Name <Req /></Form.Label><Form.Control type="text" name="last_name" value={profileForm.last_name} onChange={handleProfileFormChange} onKeyDown={(e) => { if (/[0-9]/.test(e.key)) e.preventDefault(); }} onBlur={(e) => { if (e.target.value.endsWith('-')) setProfileFieldErrors(prev => ({ ...prev, last_name: 'Cannot end with a hyphen' })); }} placeholder="Last name" disabled={verifySubmitting} style={{ ...es, border: profileFieldErrors.last_name ? '2px solid #ef4444' : es.border }} />{profileFieldErrors.last_name && <small style={{ color:'#ef4444', display:'block', marginTop:'0.3rem', fontSize:'0.78rem' }}><i className="fas fa-times-circle me-1" />{profileFieldErrors.last_name}</small>}</Form.Group></Col>
                  </Row>
                  <Row>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label style={ls}><i className="fas fa-calendar me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Birthdate <Req /></Form.Label><Form.Control type="date" name="birthdate" value={profileForm.birthdate} onChange={handleProfileFormChange} max={new Date().toISOString().split('T')[0]} disabled={verifySubmitting} style={{ ...es, colorScheme:'light' }} /></Form.Group></Col>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label style={ls}><i className="fas fa-venus-mars me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Gender <Req /></Form.Label><Form.Select name="gender" value={profileForm.gender} onChange={handleProfileFormChange} disabled={verifySubmitting} style={es}><option value="">Select Gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option></Form.Select></Form.Group></Col>
                    <Col md={4}><Form.Group className="mb-3"><Form.Label style={ls}><i className="fas fa-phone me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />Phone Number <Req /></Form.Label><Form.Control type="tel" name="phone" value={profileForm.phone} onChange={handleProfileFormChange} onKeyDown={(e) => { if (!/[0-9]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) e.preventDefault(); }} placeholder="09123456789" disabled={verifySubmitting} style={{ ...es, border: profileFieldErrors.phone ? '2px solid #ef4444' : (profileForm.phone && /^09\d{9}$/.test(profileForm.phone)) ? '2px solid #10b981' : es.border }} />{profileFieldErrors.phone && <small style={{ color:'#ef4444', display:'block', marginTop:'0.3rem', fontSize:'0.78rem' }}><i className="fas fa-times-circle me-1" />{profileFieldErrors.phone}</small>}</Form.Group></Col>
                  </Row>
                </>
              );
            })()}

            {/* Step 2 */}
            {verifyStep === 2 && (() => {
              const ls = { fontWeight:'600', color:'#1a1a1a', fontSize:'0.875rem', marginBottom:'0.4rem', display:'flex', alignItems:'center' };
              const es = { borderRadius:'10px', padding:'0.65rem 0.9rem', border:'2px solid #dee2e6', background:'#f8f9fa', color:'#1a1a1a', fontWeight:'500', fontSize:'0.9rem', transition:'all 0.2s' };
              const Req = () => <span style={{ color:'#ef4444', marginLeft:'2px' }}>*</span>;
              return (
                <>
                  <div style={{ background:'rgba(255,193,7,0.06)', border:'1.5px dashed #ffc107', borderRadius:'12px', padding:'0.85rem 1rem', marginBottom:'1.5rem', fontSize:'0.85rem', color:'#666' }}>
                    <i className="fas fa-id-card me-2" style={{ color:'#ffc107' }} />
                    Upload a clear photo of your government-issued ID. Your address will be recorded for verification.
                  </div>
                  {/* Address */}
                  <div style={{ background:'#f8f9fa', borderRadius:'12px', padding:'1rem 1.1rem', marginBottom:'1rem', border:'1.5px solid #e9ecef' }}>
                    <div style={{ ...ls, marginBottom:'0.75rem', color:'#ffc107' }}><i className="fas fa-map-marker-alt me-2" style={{ fontSize:'0.8rem' }} />Complete Address <Req /></div>
                    <Row className="mb-2">
                      <Col md={6}><Form.Group><Form.Label style={{ ...ls, fontSize:'0.8rem' }}>Province <Req /></Form.Label><Form.Select name="province" value={idForm.province} onChange={handleIdFormChange} disabled={verifySubmitting} style={{ ...es, fontSize:'0.85rem' }}><option value="">Select Province</option>{provinces.map(p => <option key={p.psgcCode} value={p.psgcCode}>{p.name}</option>)}</Form.Select></Form.Group></Col>
                      <Col md={6}><Form.Group><Form.Label style={{ ...ls, fontSize:'0.8rem' }}>City / Municipality <Req /></Form.Label><Form.Select name="city" value={idForm.city} onChange={handleIdFormChange} disabled={verifySubmitting || !idForm.province} style={{ ...es, fontSize:'0.85rem', opacity: !idForm.province ? 0.6 : 1 }}><option value="">Select City / Municipality</option>{cities.map(c => <option key={c.psgcCode} value={c.psgcCode}>{c.name}</option>)}</Form.Select></Form.Group></Col>
                    </Row>
                    <Row className="mb-2">
                      <Col md={12}><Form.Group><Form.Label style={{ ...ls, fontSize:'0.8rem' }}>Barangay <Req /></Form.Label><Form.Select name="barangay" value={idForm.barangay} onChange={handleIdFormChange} disabled={verifySubmitting || !idForm.city} style={{ ...es, fontSize:'0.85rem', opacity: !idForm.city ? 0.6 : 1 }}><option value="">Select Barangay</option>{barangayList.map(b => <option key={b.psgcCode} value={b.name}>{b.name}</option>)}</Form.Select></Form.Group></Col>
                    </Row>
                    {idForm.barangay && (
                      <Row className="mb-2">
                        <Col md={4}><Form.Group><Form.Label style={{ ...ls, fontSize:'0.8rem' }}>House / Unit No.</Form.Label><Form.Control type="text" name="house_no" value={idForm.house_no} onChange={handleIdFormChange} placeholder="e.g. 12B" disabled={verifySubmitting} style={{ ...es, fontSize:'0.85rem' }} /></Form.Group></Col>
                        <Col md={8}><Form.Group><Form.Label style={{ ...ls, fontSize:'0.8rem' }}>Street / Purok / Sitio</Form.Label><Form.Control type="text" name="street" value={idForm.street} onChange={handleIdFormChange} placeholder="e.g. Rizal St., Purok 3" disabled={verifySubmitting} style={{ ...es, fontSize:'0.85rem' }} /></Form.Group></Col>
                      </Row>
                    )}
                    {idForm.address && (
                      <div style={{ marginTop:'0.75rem', padding:'0.5rem 0.75rem', background:'rgba(255,193,7,0.08)', borderRadius:'8px', border:'1px solid rgba(255,193,7,0.25)', fontSize:'0.8rem', color:'#555' }}>
                        <i className="fas fa-check-circle me-1" style={{ color:'#ffc107' }} /><strong style={{ color:'#333' }}>Full address: </strong>{idForm.address}
                      </div>
                    )}
                  </div>
                  {/* ID Type */}
                  <Form.Group className="mb-3">
                    <Form.Label style={ls}><i className="fas fa-id-badge me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />ID Type <Req /></Form.Label>
                    <Form.Select name="valid_id_type" value={idForm.valid_id_type} onChange={handleIdFormChange} disabled={verifySubmitting} style={es}>
                      <option value="">Select ID Type</option>
                      {VALID_ID_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </Form.Select>
                  </Form.Group>
                  {/* Photos */}
                  <Row>
                    {[
                      { label: 'ID Front', req: true,  file: idFrontFile, preview: idFrontPreview, setter: setIdFrontFile, previewSetter: setIdFrontPreview, icon: 'fa-upload', iconColor: '#ffc107' },
                      { label: 'ID Back',  req: false, file: idBackFile,  preview: idBackPreview,  setter: setIdBackFile,  previewSetter: setIdBackPreview,  icon: 'fa-upload', iconColor: '#ccc' },
                      { label: 'Selfie with ID', req: false, file: selfieFile, preview: selfiePreview, setter: setSelfieFile, previewSetter: setSelfiePreview, icon: 'fa-user-circle', iconColor: '#ccc' },
                    ].map(({ label, req, preview, setter, previewSetter, icon, iconColor }) => (
                      <Col md={4} key={label}>
                        <Form.Group className="mb-3">
                          <Form.Label style={ls}><i className="fas fa-camera me-2" style={{ color:'#ffc107', fontSize:'0.8rem' }} />{label} {req ? <Req /> : <span style={{ color:'#9ca3af', fontWeight:400, marginLeft:'2px' }}>(optional)</span>}</Form.Label>
                          <label style={{ display:'block', cursor: verifySubmitting ? 'not-allowed' : 'pointer' }}>
                            <div style={{ border:'2px dashed #dee2e6', borderRadius:'12px', padding:'1rem', textAlign:'center', background:'#f8f9fa', minHeight:'120px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', transition:'all 0.2s' }}
                              onMouseOver={e => { if (!verifySubmitting) e.currentTarget.style.borderColor='#ffc107'; }}
                              onMouseOut={e  => e.currentTarget.style.borderColor='#dee2e6'}>
                              {preview ? <img src={preview} alt={label} style={{ width:'100%', maxHeight:'100px', objectFit:'contain', borderRadius:'8px' }} /> : <><i className={`fas ${icon}`} style={{ fontSize:'1.5rem', color: iconColor, marginBottom:'0.5rem' }} /><small style={{ color:'#888', fontSize:'0.78rem' }}>Click to upload</small></>}
                            </div>
                            <input type="file" accept="image/*" style={{ display:'none' }} disabled={verifySubmitting} onChange={e => handleFileChange(e, setter, previewSetter)} />
                          </label>
                        </Form.Group>
                      </Col>
                    ))}
                  </Row>
                </>
              );
            })()}
          </Modal.Body>
          <Modal.Footer style={{ padding:'1.25rem 2rem', borderTop:'1px solid #e9ecef' }}>
            {verifyStep === 1 ? (
              <>
                <Button variant="secondary" onClick={() => setShowVerifyModal(false)} disabled={verifySubmitting} style={{ borderRadius:'10px', padding:'0.75rem 1.5rem', fontWeight:'600' }}>Cancel</Button>
                <Button onClick={handleVerifyStep1Next} disabled={verifySubmitting} className="border-0"
                  style={{ background:'linear-gradient(135deg,#ffc107,#ffb300)', color:'#000', borderRadius:'10px', padding:'0.75rem 1.75rem', fontWeight:'700', boxShadow:'0 4px 14px rgba(255,193,7,0.4)' }}
                  onMouseOver={e => e.currentTarget.style.boxShadow='0 6px 20px rgba(255,193,7,0.6)'}
                  onMouseOut={e  => e.currentTarget.style.boxShadow='0 4px 14px rgba(255,193,7,0.4)'}>
                  {verifySubmitting ? <><Spinner as="span" animation="border" size="sm" className="me-2" />Saving…</> : <>Next — Upload ID <i className="fas fa-arrow-right ms-2" /></>}
                </Button>
              </>
            ) : (
              <>
                <Button variant="secondary" onClick={() => setVerifyStep(1)} disabled={verifySubmitting} style={{ borderRadius:'10px', padding:'0.75rem 1.5rem', fontWeight:'600' }}><i className="fas fa-arrow-left me-2" />Back</Button>
                <Button onClick={handleVerifySubmit} disabled={verifySubmitting} className="border-0"
                  style={{ background:'linear-gradient(135deg,#ffc107,#ffb300)', color:'#000', borderRadius:'10px', padding:'0.75rem 1.75rem', fontWeight:'700', boxShadow:'0 4px 14px rgba(255,193,7,0.4)' }}
                  onMouseOver={e => e.currentTarget.style.boxShadow='0 6px 20px rgba(255,193,7,0.6)'}
                  onMouseOut={e  => e.currentTarget.style.boxShadow='0 4px 14px rgba(255,193,7,0.4)'}>
                  {verifySubmitting ? <><Spinner as="span" animation="border" size="sm" className="me-2" />Submitting…</> : <><i className="fas fa-paper-plane me-2" />Submit for Verification</>}
                </Button>
              </>
            )}
          </Modal.Footer>
        </Modal>
      )}

      {/* ── Logout Modal ── */}
      <Modal
        show={showLogoutModal}
        onHide={() => setShowLogoutModal(false)}
        backdrop="static"
        keyboard={false}
        centered
        style={{ zoom: '0.75', zIndex: 99999 }}
      >
        <Modal.Body className="logout-modal-body" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)', borderRadius: '20px', border: '1px solid rgba(255,193,7,0.2)' }}>
          <div className="text-center mb-4">
            <div className="logout-modal-icon" style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,193,7,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', border: '3px solid rgba(255,193,7,0.3)', boxShadow: '0 8px 24px rgba(255,193,7,0.2)' }}>
              <img
                src="/logout.png"
                alt="Logout"
                style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = '<i class="fas fa-sign-out-alt" style="font-size: 2.4rem; color: #ffc107;"></i>'; }}
              />
            </div>
            <h5 style={{ fontWeight: '700', color: '#212529', marginBottom: '0.75rem', fontSize: '1.3rem' }}>Confirm Logout</h5>
            <p style={{ fontSize: '1rem', color: '#6c757d', lineHeight: '1.6', marginBottom: 0 }}>Are you sure you want to logout from your account?</p>
          </div>
          <div className="d-flex gap-3 justify-content-center">
            <Button
              variant="secondary"
              onClick={() => setShowLogoutModal(false)}
              style={{ borderRadius: '12px', padding: '0.75rem 1.75rem', fontWeight: '700', minWidth: '120px' }}
            >
              <i className="fas fa-times me-2" />Cancel
            </Button>
            <Button
              onClick={() => { setShowLogoutModal(false); onLogout(); navigate('/login'); }}
              style={{ background: 'linear-gradient(135deg, #ffc107, #ffb300)', border: 'none', color: '#1a1a1a', borderRadius: '12px', padding: '0.75rem 1.75rem', fontWeight: '700', minWidth: '120px' }}
            >
              <i className="fas fa-sign-out-alt me-2" />Yes, Logout
            </Button>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
};

export default Sidebar;