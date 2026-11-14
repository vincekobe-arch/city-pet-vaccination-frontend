import React, { useState, useEffect, useRef } from 'react';
import { Navbar as BootstrapNavbar, Nav, Container, Modal, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api, { dashboardAPI } from '../../services/api';
import { getUser } from '../../utils/auth';
import VerifyAccountModal from '../owner/VerifyAccountModal';



const ownerAPI = {
  getByUserId: (userId) => api.get(`/owners/user/${userId}`),
  update:      (id, data) => api.put(`/owners/${id}`, data),
  submitId:    (userId, formData) => api.post(`/owners/${userId}/submit-id`, formData, {
    headers: { 'Content-Type': 'application/json' }
  }),
};



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
  

  // Verification
  const [ownerProfile, setOwnerProfile]           = useState(null);
  const [showVerifyModal, setShowVerifyModal]     = useState(false);
  const [pendingVerifCount, setPendingVerifCount] = useState(0);
  const [expiredBatchCount, setExpiredBatchCount] = useState(0);
  const [pendingReportCount, setPendingReportCount] = useState(0);
  const [profileForm, setProfileForm] = useState({
    first_name: '', middle_name: '', last_name: '', birthdate: '', gender: '', phone: '',
  });

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
    if (!user) return;

    if (user.role === 'barangay_official') {
      dashboardAPI.getBatch()
        .then(({ data }) => {
          setPendingVerifCount(data.owners?.pending_count ?? 0);
          setPendingReportCount(data.pending_reports ?? 0);
          setExpiredBatchCount(data.expired_batches ?? 0);
        })
        .catch(() => {});
    }

    if (user.role === 'private_clinic') {
      api.get('/clinic/inventory').then(res => {
        const items = res.data.inventory || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        Promise.all(
          items.map(item =>
            api.get(`/clinic/inventory/batches/${item.id}`)
               .then(r => r.data.batches || []).catch(() => [])
          )
        ).then(allBatches => {
          const expired = allBatches.flat().filter(b =>
            b.expiration_date &&
            new Date(b.expiration_date) < today &&
            parseInt(b.quantity) > 0
          ).length;
          setExpiredBatchCount(expired);
        });
      }).catch(() => {});
    }

    if (user.role === 'pet_owner') {
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
    }
  }, [user]);

  // Hide sidebar on vet card view pages, login page, and register page
  const isLandingPage = location.pathname === '/';
  const knownRoutes = ['/super-admin/', '/admin/', '/community/', '/clinic/'];
  const hideRoutes = ['/vet-card-view/', '/login', '/register', '/edit-profile'];
  const isKnownRoute = knownRoutes.some(r => location.pathname.startsWith(r)) || isLandingPage;
  const shouldHide = hideRoutes.some(r => location.pathname.includes(r));

  if (shouldHide || !isKnownRoute) return null;

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
        minHeight: '75px', zoom: '0.85', borderBottom: '1px solid rgba(0,0,0,0.08)',
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

  const sidebarWidth = collapsed ? '76px' : '248px';

  // Colors for light and dark mode, used by the CSS below
  const themeVars = darkMode ? {
    '--sb-bg': '#0f0f10',
    '--sb-border': 'rgba(255,255,255,0.08)',
    '--sb-text': '#e5e7eb',
    '--sb-muted': '#a1a1aa',
    '--sb-faint': '#71717a',
    '--sb-hover': 'rgba(255,255,255,0.05)',
    '--sb-active-bg': 'rgba(255,193,7,0.13)',
    '--sb-active-text': '#ffd24d',
    '--sb-icon': '#8b8b94',
    '--sb-pill': 'rgba(255,255,255,0.05)',
    '--sb-menu-bg': '#18181b',
    '--sb-shadow': '0 12px 32px rgba(0,0,0,0.5)',
  } : {
    '--sb-bg': '#ffffff',
    '--sb-border': '#eef0f3',
    '--sb-text': '#1f2328',
    '--sb-muted': '#5b6270',
    '--sb-faint': '#9ca3af',
    '--sb-hover': '#f5f6f8',
    '--sb-active-bg': 'rgba(255,193,7,0.14)',
    '--sb-active-text': '#1f2328',
    '--sb-icon': '#7b8190',
    '--sb-pill': '#f6f7f9',
    '--sb-menu-bg': '#ffffff',
    '--sb-shadow': '0 12px 32px rgba(16,24,40,0.12)',
  };

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
            { label: 'Vet Cards', icon: 'fa-id-card', to: '/admin/vet-cards' },
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
          { label: 'Dashboard', icon: 'fa-home', to: '/community/dashboard' },
          { label: 'My Pets', icon: 'fa-paw', to: '/community/pet-status' },
          { label: 'Events', icon: 'fa-calendar', to: '/community/schedule' },
          { label: 'Reports', icon: 'fa-flag', to: '/community/reports' },
          { label: 'Map Status', icon: 'fa-map-marked-alt', to: '/community/map-status' },
        ];
      case 'private_clinic':
        return [
          { label: 'Dashboard', icon: 'fa-home', to: '/clinic/dashboard' },
          { label: 'Records', icon: 'fa-clipboard-list', to: '/clinic/records' },
          { label: 'Reports', icon: 'fa-flag', to: '/clinic/reports' },
          { label: 'Inventory', icon: 'fa-boxes', to: '/clinic/inventory', badge: expiredBatchCount },
        ];
      default:
        return [];
    }
  };

  const links = getAuthLinks();

  // Current page (for the top bar title)
  const currentPage = (() => {
    for (const link of links) {
      if (link.to && isActive(link.to)) return { label: link.label, icon: link.icon };
      const child = link.children?.find(c => isActive(c.to));
      if (child) return { label: child.label, icon: child.icon, parent: link.label };
    }
    return null;
  })();

  // Name, sub-label and initials shown in the profile button
  const displayName = !user ? '' :
    user.role === 'super_admin' ? 'Super Admin'
    : user.role === 'private_clinic' ? (user.clinic_name || `${user.first_name} ${user.last_name}`)
    : `${user.first_name} ${user.last_name}`;
  const initials = (displayName || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

  const roleLabel = (() => {
    if (!user) return null;
    const rc = {
      super_admin:       { name: 'Super Admin', color: '#ef4444', icon: 'fa-crown' },
      barangay_official: { name: user.office_role || 'Barangay Admin', color: '#e0a800', icon: 'fa-shield-alt' },
      private_clinic:    { name: 'Private Clinic', color: '#22c55e', icon: 'fa-hospital' },
    };
    return rc[user.role] || null;
  })();
  const verification = user?.role === 'pet_owner' && ownerProfile
    ? (VERIFICATION_CONFIG[ownerProfile.verification_status] || VERIFICATION_CONFIG.not_verified)
    : null;
  const pillSub = verification
    ? { name: verification.label, color: verification.color, icon: verification.icon }
    : (user?.role === 'super_admin' ? null : roleLabel);

  const goToEditProfile = () => {
    closeDropdown();
    setSidebarAnim('sidebar-slide-out');
    setMobileNavAnim('mobile-nav-slide-out');
    setMobileTopAnim('mobile-top-slide-out');
    setTimeout(() => {
      navigate('/edit-profile', { state: { from: location.pathname } });
    }, 260);
  };

  const toggleGroup = (key) => {
    if (key === 'users') setUsersDropdownOpen(o => !o);
    else setPetsDropdownOpen(o => !o);
  };

  // ─── Shared link renderer ────────────────────────────────────────────────
  const renderLink = (link, idx, isMobile) => {
    const compact = collapsed && !isMobile;

    if (link.dropdown) {
      const anyChildActive = link.children?.some(c => isActive(c.to));
      const isOpen = link.dropdownKey === 'users' ? usersDropdownOpen : petsDropdownOpen;
      return (
        <div key={idx} className={`sb-group${isOpen && !compact ? ' open' : ''}`}>
          <button
            type="button"
            className={`sb-link${anyChildActive ? ' child-active' : ''}${anyChildActive && compact ? ' active' : ''}`}
            onClick={() => {
              if (compact) {
                // Expand the sidebar so the sub-pages can be reached
                setCollapsed(false);
                if (!isOpen) toggleGroup(link.dropdownKey);
              } else {
                toggleGroup(link.dropdownKey);
              }
            }}
            aria-expanded={isOpen && !compact}
            title={compact ? link.label : undefined}
          >
            <i className={`fas ${link.icon} ic`} />
            {!compact && (
              <>
                <span className="sb-label">{link.label}</span>
                <i className="fas fa-chevron-down sb-chev" />
              </>
            )}
          </button>

          {!compact && isOpen && (
            <div className="sb-children">
              {link.children?.map((child, cIdx) => {
                const childActive = isActive(child.to);
                return (
                  <Link
                    key={cIdx}
                    to={child.to}
                    className={`sb-sublink${childActive ? ' active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <i className={`fas ${child.icon} ic`} />
                    <span className="sb-label">{child.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    const active = link.to ? isActive(link.to) : false;
    const content = (
      <>
        <i className={`fas ${link.icon} ic`} />
        {!compact && <span className="sb-label">{link.label}</span>}
        {link.badge > 0 && (
          <span className={`sb-badge${compact ? ' dot' : ''}`}>{link.badge > 9 ? '9+' : link.badge}</span>
        )}
      </>
    );

    if (link.to) {
      return (
        <Link
          key={idx}
          to={link.to}
          className={`sb-link${active ? ' active' : ''}`}
          onClick={() => setMobileOpen(false)}
          title={compact ? link.label : undefined}
          aria-current={active ? 'page' : undefined}
        >
          {content}
        </Link>
      );
    }

    return (
      <button key={idx} type="button" className="sb-link" onClick={link.action} title={compact ? link.label : undefined}>
        {content}
      </button>
    );
  };

  // ─── Sidebar inner content ───────────────────────────────────────────────
  const sidebarContent = (isMobile = false) => {
    const compact = collapsed && !isMobile;
    return (
      <div className={`sb-inner${compact ? ' sb-collapsed' : ''}`}>
        {/* Logo */}
        <div className="sb-brand">
          <Link to="/" className="sb-brand-link" title="PetUnity">
            <img
              src="/logo.png"
              alt="Logo"
              className="sb-logo"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
            {!compact && (
              <span className="sb-brand-text">
                <span className="name"><span style={{ color: '#ffc107' }}>Pet</span>Unity</span>
                <span className="sub">Muntinlupa City</span>
              </span>
            )}
          </Link>
        </div>

        {/* Nav links */}
        <nav className="sb-nav">
          {!compact && links.length > 0 && <div className="sb-section">Main menu</div>}
          {links.map((link, idx) => renderLink(link, idx, isMobile))}
        </nav>

        {/* Collapse toggle */}
        {!isMobile && (
          <div className="sb-foot">
            <button
              type="button"
              className="sb-link sb-collapse-btn"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <i className={`fas ${collapsed ? 'fa-angle-double-right' : 'fa-angle-double-left'} ic`} />
              {!collapsed && <span className="sb-label">Collapse</span>}
            </button>
          </div>
        )}
      </div>
    );
  };

  const mobileLinks = links.flatMap((link, idx) => {
    if (link.dropdown) {
      return (link.children || []).map((child, cIdx) => ({ ...child, _key: `${idx}-${cIdx}` }));
    }
    return [{ ...link, _key: String(idx) }];
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        .sidebar-scroll::-webkit-scrollbar { display: none; }
        nav::-webkit-scrollbar { display: none; }

        /* ── Sidebar ── */
        .sb-inner { display: flex; flex-direction: column; height: 100vh; overflow: hidden; background: var(--sb-bg); color: var(--sb-text); }
        .sb-brand { display: flex; align-items: center; height: 64px; padding: 0 1.1rem; border-bottom: 1px solid var(--sb-border); flex-shrink: 0; }
        .sb-collapsed .sb-brand { justify-content: center; padding: 0; }
        .sb-brand-link { display: flex; align-items: center; gap: 0.65rem; text-decoration: none; min-width: 0; }
        .sb-logo { width: 36px; height: 36px; object-fit: contain; flex-shrink: 0; }
        .sb-brand-text { display: flex; flex-direction: column; line-height: 1.15; white-space: nowrap; animation: sbFade 0.25s ease; }
        .sb-brand-text .name { font-weight: 800; font-size: 1.15rem; color: var(--sb-text); letter-spacing: -0.01em; }
        .sb-brand-text .sub { font-size: 0.68rem; font-weight: 600; color: var(--sb-faint); text-transform: uppercase; letter-spacing: 0.08em; }

        .sb-nav { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 1rem 0.75rem; scrollbar-width: none; min-height: 0; }
        .sb-section { font-size: 0.66rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: var(--sb-faint); padding: 0 0.85rem; margin-bottom: 0.5rem; white-space: nowrap; }

        .sb-link { position: relative; display: flex; align-items: center; gap: 0.75rem; width: 100%; height: 42px; padding: 0 0.85rem; margin-bottom: 2px; border: none; border-radius: 10px; background: transparent; color: var(--sb-muted); font-size: 0.875rem; font-weight: 500; text-decoration: none; text-align: left; white-space: nowrap; cursor: pointer; transition: background 0.18s ease, color 0.18s ease; }
        .sb-link:hover { background: var(--sb-hover); color: var(--sb-text); }
        .sb-link .ic { width: 20px; text-align: center; font-size: 0.95rem; color: var(--sb-icon); flex-shrink: 0; transition: color 0.18s ease, transform 0.18s ease; }
        .sb-link:hover .ic { color: var(--sb-text); }
        .sb-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        .sb-link.active { background: var(--sb-active-bg); color: var(--sb-active-text); font-weight: 600; }
        .sb-link.active .ic { color: #e0a800; }
        .sb-link.active::before { content: ''; position: absolute; left: -0.75rem; top: 9px; bottom: 9px; width: 3px; border-radius: 0 3px 3px 0; background: #ffc107; animation: sbBar 0.25s ease-out; }
        .sb-link.child-active { color: var(--sb-text); font-weight: 600; }
        .sb-link.child-active .ic { color: #e0a800; }
        .sb-chev { font-size: 0.65rem; color: var(--sb-faint); transition: transform 0.25s ease; }
        .sb-group.open .sb-chev { transform: rotate(180deg); }
        .sb-children { margin: 0 0 6px 1.6rem; padding-left: 0.6rem; border-left: 1px solid var(--sb-border); animation: sbDrop 0.22s ease-out; }
        .sb-sublink { display: flex; align-items: center; gap: 0.6rem; height: 36px; padding: 0 0.75rem; margin-bottom: 2px; border-radius: 8px; color: var(--sb-muted); font-size: 0.84rem; font-weight: 500; text-decoration: none; transition: background 0.18s ease, color 0.18s ease; }
        .sb-sublink .ic { width: 16px; text-align: center; font-size: 0.8rem; color: var(--sb-icon); }
        .sb-sublink:hover { background: var(--sb-hover); color: var(--sb-text); }
        .sb-sublink.active { background: var(--sb-active-bg); color: var(--sb-active-text); font-weight: 600; }
        .sb-sublink.active .ic { color: #e0a800; }

        .sb-badge { background: #ef4444; color: #fff; border-radius: 999px; font-size: 0.62rem; font-weight: 700; padding: 0.1rem 0.42rem; min-width: 18px; text-align: center; line-height: 1.4; flex-shrink: 0; }
        .sb-badge.dot { position: absolute; top: 5px; right: 12px; font-size: 0.55rem; min-width: 16px; padding: 0.05rem 0.3rem; box-shadow: 0 0 0 2px var(--sb-bg); }

        .sb-collapsed .sb-link { justify-content: center; gap: 0; padding: 0; }
        .sb-collapsed .sb-link .ic { font-size: 1.02rem; }
        .sb-collapsed .sb-link.active::before { left: -0.75rem; }

        .sb-foot { flex-shrink: 0; padding: 0.6rem 0.75rem 0.85rem; border-top: 1px solid var(--sb-border); }
        .sb-collapse-btn { margin-bottom: 0; }

        .sb-link:focus-visible, .sb-sublink:focus-visible, .sb-brand-link:focus-visible, .sb-icon-btn:focus-visible, .profile-pill:focus-visible, .sb-menu-item:focus-visible, .sb-tab:focus-visible { outline: 2px solid #ffc107; outline-offset: 2px; }

        @keyframes sbFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes sbBar { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes sbDrop { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }

        /* ── Top bar ── */
        .sb-page { display: flex; align-items: center; gap: 0.6rem; flex: 1; min-width: 0; padding-left: 1.5rem; }
        .sb-page .ic { width: 34px; height: 34px; border-radius: 10px; background: var(--sb-active-bg); color: #e0a800; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0; }
        .sb-page .crumb { font-size: 0.72rem; color: var(--sb-faint); font-weight: 600; line-height: 1.1; }
        .sb-page .title { font-size: 0.98rem; font-weight: 700; color: var(--sb-text); line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sb-icon-btn { width: 38px; height: 38px; border-radius: 10px; border: 1px solid var(--sb-border); background: var(--sb-bg); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: background 0.18s ease, border-color 0.18s ease; padding: 0; }
        .sb-icon-btn:hover { background: var(--sb-hover); border-color: #ffc107; }
        .sb-icon-btn img { width: 18px; height: 18px; object-fit: contain; }

        .profile-pill { display: flex; align-items: center; gap: 0.65rem; padding: 0.3rem 0.75rem 0.3rem 0.3rem; border-radius: 999px; background: var(--sb-pill); border: 1px solid var(--sb-border); cursor: pointer; user-select: none; transition: background 0.18s ease, border-color 0.18s ease; }
        .profile-pill:hover, .profile-pill.open { border-color: rgba(255,193,7,0.6); background: var(--sb-active-bg); }
        .sb-avatar { position: relative; width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, #ffd54f, #ffb300); color: #1f2328; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; flex-shrink: 0; letter-spacing: 0.02em; }
        .sb-avatar.lg { width: 44px; height: 44px; font-size: 0.95rem; }
        .sb-avatar .online { position: absolute; bottom: -1px; right: -1px; width: 10px; height: 10px; border-radius: 50%; background: #22c55e; border: 2px solid var(--sb-bg); }
        .sb-pill-text { line-height: 1.25; min-width: 0; }
        .sb-pill-name { font-size: 0.82rem; font-weight: 700; color: var(--sb-text); white-space: nowrap; max-width: 200px; overflow: hidden; text-overflow: ellipsis; }
        .sb-pill-sub { font-size: 0.66rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
        .profile-pill .sb-chev { margin-left: 0.15rem; }
        .profile-pill.open .sb-chev { transform: rotate(180deg); }

        .profile-dropdown-menu { position: absolute; top: calc(100% + 0.5rem); right: 0; min-width: 260px; background: var(--sb-menu-bg); border: 1px solid var(--sb-border); border-radius: 14px; box-shadow: var(--sb-shadow); z-index: 10001; padding: 0.4rem; overflow: hidden; }
        .sb-menu-head { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 0.7rem 0.85rem; }
        .sb-menu-head .n { font-size: 0.9rem; font-weight: 700; color: var(--sb-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
        .sb-menu-head .e { font-size: 0.75rem; color: var(--sb-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
        .sb-chip { display: inline-flex; align-items: center; gap: 0.3rem; margin-top: 0.35rem; border-radius: 999px; padding: 0.15rem 0.55rem; font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; }
        .sb-menu-sep { height: 1px; background: var(--sb-border); margin: 0.3rem 0.2rem; }
        .sb-menu-item { display: flex; align-items: center; gap: 0.65rem; width: 100%; padding: 0.6rem 0.7rem; border: none; border-radius: 9px; background: transparent; color: var(--sb-text); font-size: 0.84rem; font-weight: 500; text-align: left; cursor: pointer; transition: background 0.15s ease; }
        .sb-menu-item .ic { width: 28px; height: 28px; border-radius: 8px; background: var(--sb-hover); color: var(--sb-muted); display: flex; align-items: center; justify-content: center; font-size: 0.78rem; flex-shrink: 0; }
        .sb-menu-item:hover { background: var(--sb-hover); }
        .sb-menu-item.warn { color: #b88a00; }
        .sb-menu-item.warn .ic { background: rgba(255,193,7,0.15); color: #e0a800; }
        .sb-menu-item.danger { color: #ef4444; }
        .sb-menu-item.danger .ic { background: rgba(239,68,68,0.1); color: #ef4444; }
        .sb-menu-item.danger:hover { background: rgba(239,68,68,0.07); }

        /* ── Mobile bottom bar ── */
        .sb-tab { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-width: 62px; height: 56px; padding: 0 0.6rem; text-decoration: none; color: var(--sb-icon); }
        .sb-tab i { font-size: 1.05rem; transition: transform 0.2s ease; }
        .sb-tab span { font-size: 0.62rem; font-weight: 600; white-space: nowrap; }
        .sb-tab.active { color: #e0a800; }
        .sb-tab.active span { color: var(--sb-text); font-weight: 700; }
        .sb-tab.active i { transform: translateY(-1px); }
        .sb-tab.active::before { content: ''; position: absolute; top: 0; left: 50%; width: 26px; height: 3px; margin-left: -13px; border-radius: 0 0 3px 3px; background: #ffc107; animation: sbFade 0.25s ease; }
        .sb-tab .sb-badge { position: absolute; top: 6px; right: 12px; font-size: 0.5rem; min-width: 15px; padding: 0.05rem 0.3rem; }

        @media (max-width: 991px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-spacer  { display: none !important; }
          .sidebar-bottom-bar { display: flex !important; }
          .top-navbar-bar { left: 0 !important; top: 0 !important; height: 64px !important; padding-right: 0.75rem !important; gap: 0.5rem !important; }
          .flex-grow-1 main, main.flex-grow-1 { padding-bottom: 64px !important; }
          .sidebar-mobile-toggle { display: none !important; }
          .navbar-toggler { display: none !important; }
          .modal { zoom: 0.75 !important; }
          .sb-page { display: none !important; }
          .profile-pill { padding: 0.2rem 0.5rem 0.2rem 0.2rem !important; gap: 0.4rem !important; }
          .profile-pill .sb-avatar { width: 28px !important; height: 28px !important; font-size: 0.65rem !important; }
          .profile-pill .sb-pill-name { font-size: 0.72rem !important; max-width: 120px !important; }
          .profile-pill .sb-pill-sub { font-size: 0.56rem !important; }
          .profile-pill .sb-chev { display: none !important; }
          .landing-brand { display: none !important; }
          .landing-register-btn { display: none !important; }
          .landing-nav-label { display: none !important; }
          .landing-nav-icon { font-size: 1.1rem !important; margin: 0 !important; }
          .landing-nav-links { display: none !important; }
          .navbar-mobile-brand { display: flex !important; }
          .profile-dropdown-menu { zoom: 0.85 !important; min-width: 230px !important; right: -0.25rem !important; }
          .logout-modal-body { padding: 1.5rem !important; }
        }
        @media (min-width: 992px) {
          .sidebar-mobile-overlay { display: none !important; }
          .sidebar-mobile-toggle  { display: none !important; }
          .sidebar-bottom-bar { display: none !important; }
          .qr-scanner-icon { display: none !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .sb-brand-text, .sb-children, .sb-link.active::before, .sb-tab.active::before { animation: none !important; }
          .sb-link, .sb-sublink, .sb-chev, .profile-pill { transition: none !important; }
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
        .sidebar-slide-out { animation: sidebarSlideOut 0.28s cubic-bezier(0.4,0,0.2,1) forwards; }
        .sidebar-slide-in { animation: sidebarSlideIn 0.32s cubic-bezier(0.4,0,0.2,1) forwards; }
        .mobile-nav-slide-out { animation: mobileNavSlideOut 0.28s cubic-bezier(0.4,0,0.2,1) forwards; }
        .mobile-nav-slide-in { animation: mobileNavSlideIn 0.32s cubic-bezier(0.4,0,0.2,1) forwards; }
        .mobile-top-slide-out { animation: mobileTopSlideOut 0.28s cubic-bezier(0.4,0,0.2,1) forwards; }
        .mobile-top-slide-in { animation: mobileTopSlideIn 0.32s cubic-bezier(0.4,0,0.2,1) forwards; }
        @keyframes dropdownFadeIn {
          0%   { opacity: 0; transform: translateY(-8px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes dropdownFadeOut {
          0%   { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-8px) scale(0.98); }
        }
        .modal { z-index: 99999 !important; }
        .modal-backdrop { z-index: 99998 !important; }

        /* ── Modals ── */
        .sb-modal .modal-content { border: none; border-radius: 16px; box-shadow: 0 24px 60px rgba(16,24,40,0.2); overflow: hidden; }
        .sb-modal-head { display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem; border-bottom: 1px solid #eef0f3; }
        .sb-modal-head .ic { width: 40px; height: 40px; border-radius: 11px; background: rgba(255,193,7,0.15); color: #e0a800; display: flex; align-items: center; justify-content: center; font-size: 1rem; flex-shrink: 0; }
        .sb-modal-head .t { font-weight: 700; font-size: 1rem; color: #1f2328; line-height: 1.2; }
        .sb-modal-head .s { font-size: 0.78rem; color: #6b7280; }
        .sb-modal-close { margin-left: auto; width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; color: #6b7280; display: flex; align-items: center; justify-content: center; }
        .sb-modal-close:hover { background: #f3f4f6; color: #1f2328; }
        .sb-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; padding: 0.65rem 1.2rem; border-radius: 10px; font-weight: 600; font-size: 0.9rem; border: 1px solid transparent; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
        .sb-btn.primary { background: #ffc107; color: #1f2328; }
        .sb-btn.primary:hover { background: #f0b400; box-shadow: 0 4px 12px rgba(255,193,7,0.35); transform: translateY(-1px); }
        .sb-btn.ghost { background: #fff; color: #1f2328; border-color: #e5e7eb; }
        .sb-btn.ghost:hover { background: #f6f7f9; }
        .sb-btn.danger { background: #ef4444; color: #fff; }
        .sb-btn.danger:hover { background: #dc2626; box-shadow: 0 4px 12px rgba(239,68,68,0.3); transform: translateY(-1px); }
        .sb-pet-head { display: flex; align-items: center; gap: 0.75rem; padding: 0.9rem 1rem; border-radius: 12px; background: #fafbfc; border: 1px solid #eef0f3; margin-bottom: 0.85rem; }
        .sb-pet-head .pic { width: 48px; height: 48px; border-radius: 12px; background: #fff; border: 1px solid #eef0f3; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sb-pet-head .pic img { width: 32px; height: 32px; object-fit: contain; }
        .sb-details { border: 1px solid #eef0f3; border-radius: 12px; overflow: hidden; margin-bottom: 1rem; }
        .sb-details .row-i { display: flex; justify-content: space-between; gap: 1rem; padding: 0.55rem 0.85rem; font-size: 0.82rem; animation: sbFade 0.3s ease backwards; }
        .sb-details .row-i + .row-i { border-top: 1px solid #f3f4f6; }
        .sb-details .k { color: #6b7280; font-weight: 500; white-space: nowrap; }
        .sb-details .v { color: #1f2328; font-weight: 600; text-align: right; word-break: break-word; }

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
        .scan-error-overlay { animation: scanError 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .scan-error-icon { animation: shake 0.5s ease-in-out 0.3s; }
        .scan-success-overlay { animation: scanSuccess 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards; }
        .scan-line {
          position: absolute;
          left: 8px; right: 8px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #ffc107, transparent);
          animation: scanLine 1.8s ease-in-out infinite;
          box-shadow: 0 0 8px rgba(255,193,7,0.8);
        }
      ` }} />

      {/* ── Top bar ── */}
      {!isLandingPage && user && (
        <div className={`top-navbar-bar ${mobileTopAnim}`} style={{
          ...themeVars,
          position: 'fixed',
          top: 0,
          left: sidebarWidth,
          right: 0,
          height: '64px',
          background: 'var(--sb-bg)',
          borderBottom: '1px solid var(--sb-border)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingRight: '1.5rem',
          gap: '0.75rem',
          transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)',
        }}>
          {/* Current page — desktop */}
          <div className="sb-page">
            {currentPage && (
              <>
                <div className="ic"><i className={`fas ${currentPage.icon}`} /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="crumb">{currentPage.parent || 'PetUnity'}</div>
                  <div className="title">{currentPage.label}</div>
                </div>
              </>
            )}
          </div>

          {/* Logo — mobile only */}
          <div className="navbar-mobile-brand" style={{ display: 'none', alignItems: 'center', gap: '0.45rem', flex: 1, paddingLeft: '0.85rem' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '28px', height: '28px', objectFit: 'contain' }} onError={e => e.target.style.display = 'none'} />
            <span style={{ fontWeight: '800', fontSize: '1.05rem', color: 'var(--sb-text)' }}>
              <span style={{ color: '#ffc107' }}>Pet</span>Unity
            </span>
          </div>

          {/* QR Scanner — mobile only, non-super_admin only */}
          {user?.role !== 'super_admin' && (
            <>
              <button
                type="button"
                className="qr-scanner-icon sb-icon-btn"
                onClick={() => setShowScannerModal(true)}
                aria-label="Scan pet QR code"
                title="Scan pet QR code"
              >
                <img
                  src="/scanner.png"
                  alt=""
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'inline'; }}
                />
                <i className="fas fa-qrcode" style={{ display: 'none', color: 'var(--sb-text)' }} />
              </button>

              {/* QR Scanner Modal */}
              <Modal
                show={showScannerModal}
                onHide={() => setShowScannerModal(false)}
                centered
                size="sm"
                dialogClassName="sb-modal"
                style={{ zIndex: 99999 }}
              >
                <div className="sb-modal-head">
                  <div className="ic"><i className="fas fa-qrcode" /></div>
                  <div>
                    <div className="t">{scanResult ? 'Pet details' : 'Scan pet QR code'}</div>
                    <div className="s">{scanResult ? 'From the pet\'s QR code' : 'Point your camera at the QR code'}</div>
                  </div>
                  <button type="button" className="sb-modal-close" onClick={() => setShowScannerModal(false)} aria-label="Close">
                    <i className="fas fa-times" />
                  </button>
                </div>
                <Modal.Body style={{ padding: '1.1rem 1.25rem 1.25rem', maxHeight: '75vh', overflowY: 'auto' }}>
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
                            <div className="sb-pet-head">
                              <div className="pic">
                                <img src={speciesIcon} alt={data.species} onError={e => e.target.style.display = 'none'} />
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: '800', fontSize: '1.05rem', color: '#1f2328' }}>{data.name}</div>
                                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600', textTransform: 'capitalize' }}>{data.species}{data.breed && data.breed !== 'Unknown' ? ` · ${data.breed}` : ''}</div>
                              </div>
                              <span style={{ marginLeft: 'auto', background: 'rgba(25,135,84,0.1)', color: '#198754', borderRadius: '999px', fontSize: '0.66rem', fontWeight: '700', padding: '0.2rem 0.6rem', whiteSpace: 'nowrap' }}>
                                <i className="fas fa-check-circle me-1" />Registered
                              </span>
                            </div>

                            <div className="sb-details">
                              {rows.map((row, i) => (
                                <div key={row.label} className="row-i" style={{ animationDelay: `${i * 0.03}s` }}>
                                  <span className="k">{row.label}</span>
                                  <span className="v" style={{ textTransform: ['Species', 'Gender', 'Sterilized'].includes(row.label) ? 'capitalize' : 'none' }}>{row.value}</span>
                                </div>
                              ))}
                            </div>

                            <button type="button" className="sb-btn primary w-100" onClick={() => setScanResult('')}>
                              <i className="fas fa-redo" />Scan another
                            </button>
                          </div>
                        );
                      } catch {
                        return (
                          <div>
                            <div style={{ background: 'rgba(220,53,69,0.06)', border: '1px solid rgba(220,53,69,0.25)', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#b02a37' }}>
                              <i className="fas fa-exclamation-triangle me-2" />Could not read the QR code data.
                            </div>
                            <button type="button" className="sb-btn primary w-100" onClick={() => setScanResult('')}>
                              <i className="fas fa-redo" />Try again
                            </button>
                          </div>
                        );
                      }
                    })()
                  ) : (
                    <div>
                      {/* Scanner + overlays — scanner div always stays mounted */}
                      <div style={{ position: 'relative', borderRadius: '14px', overflow: 'hidden', minHeight: '260px', background: '#111' }}>
                        <div id="qr-reader" style={{ width: '100%', borderRadius: '14px', overflow: 'hidden' }} />
                        <div className="scan-line" style={{ display: scanSucess || scanError ? 'none' : 'block' }} />
                        <div style={{
                          position: 'absolute', inset: 0, borderRadius: '14px',
                          border: `3px solid ${scanError ? 'rgba(220,53,69,0.6)' : 'rgba(255,193,7,0.6)'}`,
                          pointerEvents: 'none',
                          animation: 'scanPulse 2s ease-in-out infinite',
                          transition: 'border-color 0.3s',
                        }} />

                        {/* Success overlay */}
                        {scanSucess && (
                          <div className="scan-success-overlay" style={{
                            position: 'absolute', inset: 0, borderRadius: '14px',
                            background: 'rgba(255,255,255,0.97)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.65rem',
                          }}>
                            <div style={{
                              width: '68px', height: '68px', borderRadius: '50%',
                              background: '#198754',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 8px 24px rgba(25,135,84,0.35)',
                            }}>
                              <i className="fas fa-check" style={{ fontSize: '1.8rem', color: '#fff' }} />
                            </div>
                            <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1f2328' }}>Scan complete</div>
                            <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>Loading pet information...</div>
                            <Spinner animation="border" size="sm" style={{ color: '#ffc107' }} />
                          </div>
                        )}

                        {/* Error overlay */}
                        {scanError && (
                          <div className="scan-error-overlay" style={{
                            position: 'absolute', inset: 0, borderRadius: '14px',
                            background: 'rgba(255,255,255,0.97)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.65rem',
                            padding: '1rem',
                          }}>
                            <div className="scan-error-icon" style={{
                              width: '68px', height: '68px', borderRadius: '50%',
                              background: '#dc3545',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 8px 24px rgba(220,53,69,0.35)',
                            }}>
                              <i className="fas fa-times" style={{ fontSize: '1.8rem', color: '#fff' }} />
                            </div>
                            <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1f2328' }}>Not recognized</div>
                            <div style={{ fontSize: '0.78rem', color: '#6b7280', textAlign: 'center', lineHeight: 1.5 }}>
                              This is not a registered PetUnity pet QR code.
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#b02a37', fontWeight: '600' }}>
                              <i className="fas fa-sync-alt me-1" />Resuming the scanner...
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem', padding: '0.6rem 0.75rem', borderRadius: '10px', background: '#fafbfc', border: '1px solid #eef0f3', fontSize: '0.76rem', color: '#6b7280' }}>
                        <i className="fas fa-lightbulb" style={{ color: '#e0a800' }} />
                        Keep the QR code well lit and inside the frame.
                      </div>
                    </div>
                  )}
                </Modal.Body>
              </Modal>
            </>
          )}

          {/* Profile button */}
          <div style={{ position: 'relative' }}>
            <div
              role="button"
              tabIndex={0}
              aria-haspopup="menu"
              aria-expanded={showProfileDropdown && !dropdownClosing}
              onClick={() => {
                if (dropdownOpenRef.current) {
                  closeDropdown();
                } else {
                  dropdownOpenRef.current = true;
                  setShowProfileDropdown(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); }
              }}
              className={`profile-pill${showProfileDropdown && !dropdownClosing ? ' open' : ''}`}
            >
              <div className="sb-avatar">
                {initials}
                <span className="online" />
              </div>
              <div className="sb-pill-text">
                <div className="sb-pill-name">{displayName}</div>
                {pillSub && (
                  <div className="sb-pill-sub" style={{ color: pillSub.color }}>
                    {verification && <i className={`fas ${pillSub.icon} me-1`} style={{ fontSize: '0.55rem' }} />}
                    {pillSub.name}
                  </div>
                )}
              </div>
              <i className="fas fa-chevron-down sb-chev" />
            </div>

            {/* Dropdown */}
            {(showProfileDropdown || dropdownClosing) && (
              <>
                <div
                  onClick={() => closeDropdown()}
                  style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'transparent', cursor: 'default' }}
                />
                <div
                  className="profile-dropdown-menu"
                  role="menu"
                  style={{
                    animation: `${dropdownClosing ? 'dropdownFadeOut' : 'dropdownFadeIn'} 0.2s cubic-bezier(0.4,0,0.2,1) forwards`,
                    transformOrigin: 'top right',
                  }}
                >
                  {/* User info */}
                  <div className="sb-menu-head">
                    <div className="sb-avatar lg">{initials}</div>
                    <div style={{ minWidth: 0 }}>
                      <div className="n">{displayName}</div>
                      {user.email && <div className="e">{user.email}</div>}
                      {verification ? (
                        <div className="sb-chip" style={{ color: verification.color, background: verification.color + '18' }}>
                          <i className={`fas ${verification.icon}`} style={{ fontSize: '0.55rem' }} />{verification.label}
                        </div>
                      ) : roleLabel ? (
                        <div className="sb-chip" style={{ color: roleLabel.color, background: roleLabel.color + '18' }}>
                          <i className={`fas ${roleLabel.icon}`} style={{ fontSize: '0.55rem' }} />{roleLabel.name}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="sb-menu-sep" />

                  {/* Verify Account — community */}
                  {user.role === 'pet_owner' && ownerProfile &&
                    (ownerProfile.verification_status === 'not_verified' || ownerProfile.verification_status === 'semi_verified') && (
                    <button type="button" role="menuitem" className="sb-menu-item warn" onClick={() => { closeDropdown(); setShowVerifyModal(true); }}>
                      <span className="ic"><i className="fas fa-id-card" /></span>
                      Verify account
                    </button>
                  )}

                  {/* Update Password — super admin only */}
                  {user.role === 'super_admin' && (
                    <button type="button" role="menuitem" className="sb-menu-item" onClick={goToEditProfile}>
                      <span className="ic"><i className="fas fa-key" /></span>
                      Update password
                    </button>
                  )}

                  {/* Edit Profile */}
                  {(user.role === 'barangay_official' || user.role === 'pet_owner' || user.role === 'private_clinic') && (
                    <button type="button" role="menuitem" className="sb-menu-item" onClick={goToEditProfile}>
                      <span className="ic"><i className="fas fa-user-edit" /></span>
                      Edit profile
                    </button>
                  )}

                  <div className="sb-menu-sep" />

                  {/* Sign out */}
                  <button type="button" role="menuitem" className="sb-menu-item danger" onClick={() => { closeDropdown(); setShowLogoutModal(true); }}>
                    <span className="ic"><i className="fas fa-sign-out-alt" /></span>
                    Sign out
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

      {/* ── Desktop Sidebar ── */}
      <div
        className={`sidebar-desktop ${sidebarAnim}`}
        style={{
          ...themeVars,
          width: sidebarWidth,
          height: '100vh',
          background: 'var(--sb-bg)',
          borderRight: '1px solid var(--sb-border)',
          position: 'fixed',
          top: 0,
          left: 0,
          flexShrink: 0,
          transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
          zIndex: 10000,
        }}
      >
        {sidebarContent(false)}
      </div>

      {/* ── Bottom Nav Bar (mobile only) ── */}
      {!isLandingPage && user && (
        <div
          className={`sidebar-bottom-bar ${mobileNavAnim}`}
          style={{
            ...themeVars,
            display: 'none',
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '56px',
            background: 'var(--sb-bg)',
            borderTop: '1px solid var(--sb-border)',
            zIndex: 10000,
            alignItems: 'center',
            overflowX: 'auto',
            overflowY: 'hidden',
            scrollbarWidth: 'none',
            boxShadow: darkMode ? '0 -2px 12px rgba(0,0,0,0.3)' : '0 -2px 12px rgba(16,24,40,0.05)',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <style>{`.sidebar-bottom-bar::-webkit-scrollbar { display: none; }`}</style>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            width: '100%',
            padding: '0 0.25rem',
            height: '100%',
            justifyContent: user?.role === 'pet_owner' ? 'space-around' : 'flex-start',
            minWidth: user?.role === 'pet_owner' ? 'unset' : 'max-content',
          }}>
            {mobileLinks.map((link) => {
              const active = link.to ? isActive(link.to) : false;
              const inner = (
                <>
                  <i className={`fas ${link.icon}`} />
                  <span>{link.label}</span>
                  {link.badge > 0 && <span className="sb-badge">{link.badge > 9 ? '9+' : link.badge}</span>}
                </>
              );
              return link.to ? (
                <Link key={link._key} to={link.to} className={`sb-tab${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>{inner}</Link>
              ) : (
                <div key={link._key} className="sb-tab" onClick={link.action}>{inner}</div>
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
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            style={{
              ...themeVars,
              position: 'relative',
              width: '256px',
              height: '100%',
              background: 'var(--sb-bg)',
              borderRight: '1px solid var(--sb-border)',
              zIndex: 1,
              overflowY: 'auto',
            }}
          >
            {sidebarContent(true)}
          </div>
        </div>
      )}

      {/* ── Logout Modal ── */}
      <Modal
        show={showLogoutModal}
        onHide={() => setShowLogoutModal(false)}
        backdrop="static"
        keyboard={false}
        centered
        dialogClassName="sb-modal"
        style={{ zoom: '0.75', zIndex: 99999 }}
      >
        <Modal.Body className="logout-modal-body" style={{ padding: '2rem 2rem 1.5rem', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.6rem' }}>
            <i className="fas fa-sign-out-alt" />
          </div>
          <h5 style={{ fontWeight: '700', color: '#1f2328', marginBottom: '0.4rem', fontSize: '1.2rem' }}>Sign out?</h5>
          <p style={{ fontSize: '0.92rem', color: '#6b7280', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            You will need to sign in again to use your account.
          </p>
          <div className="d-flex gap-2">
            <button type="button" className="sb-btn ghost flex-fill" onClick={() => setShowLogoutModal(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="sb-btn danger flex-fill"
              onClick={() => { setShowLogoutModal(false); onLogout(); navigate('/login'); }}
            >
              <i className="fas fa-sign-out-alt" />Sign out
            </button>
          </div>
        </Modal.Body>
      </Modal>

      {/* ── Verify Account Modal ── */}
      <VerifyAccountModal
        show={showVerifyModal}
        onHide={() => setShowVerifyModal(false)}
        ownerProfile={ownerProfile}
        profileForm={profileForm}
        onVerified={(updatedOwner) => setOwnerProfile(updatedOwner)}
      />
    </>
  );
};

export default Sidebar;