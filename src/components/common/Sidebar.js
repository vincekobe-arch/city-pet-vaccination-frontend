import React, { useState, useEffect, useRef } from 'react';
import { Navbar as BootstrapNavbar, Nav, Container, Modal, Button } from 'react-bootstrap';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api, { dashboardAPI } from '../../services/api';
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
  const [loggingOut, setLoggingOut] = useState(false);
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
            let petCode = null;

            // New QR codes hold a link like https://petunity-muntinlupacity.com/pet/8f3k2a9xq7c1
            const linkMatch = decodedText.match(/\/pet\/([a-f0-9]{12})(?:[/?#]|$)/i);
            if (linkMatch) {
              petCode = linkMatch[1].toLowerCase();
              isValid = true;
            } else {
              // Older QR codes hold the pet details as JSON
              try {
                const parsed = JSON.parse(decodedText);
                isValid = !!(parsed.microchip && parsed.name && parsed.reg_no);
              } catch {
                isValid = false;
              }
            }

            if (isValid) {
              scannerStateRef.current = 'success';
              playScanBeep();
              setScanSucess(true);
              setTimeout(() => {
                if (cancelled) return;
                setScanSucess(false);
                scannerStateRef.current = 'idle';
                if (petCode) {
                  setShowScannerModal(false);
                  navigate(`/pet/${petCode}`);
                } else {
                  setScanResult(decodedText);
                }
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

  // Mobile bottom bar: keep the current page's tab in view
  useEffect(() => {
    const t = setTimeout(() => {
      const bar = document.querySelector('.sidebar-bottom-bar');
      const tab = bar?.querySelector('.sb-tab.active');
      if (bar && tab && bar.scrollWidth > bar.clientWidth) {
        bar.scrollTo({ left: tab.offsetLeft - (bar.clientWidth - tab.offsetWidth) / 2, behavior: 'smooth' });
      }
    }, 50);
    return () => clearTimeout(t);
  }, [location.pathname]);

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
      if (location.pathname === '/super-admin/officials' || location.pathname === '/super-admin/community') {
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

  const bg = darkMode
    ? 'linear-gradient(180deg, #0d0d0d 0%, #111111 100%)'
    : 'linear-gradient(180deg, #ffffff 0%, #f9f9f9 100%)';

  const border = darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
  const textColor = darkMode ? '#e0e0e0' : '#1a1a1a';
  const subTextColor = darkMode ? '#666' : '#aaa';

  const sidebarWidth = collapsed ? '72px' : '240px';

  // Active link: light yellow tint instead of a solid yellow button
  const activeBg = 'rgba(255,193,7,0.14)';
  const activeText = darkMode ? '#ffd24d' : '#1a1a1a';

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
          
          { label: 'Users', icon: 'fa-user-friends', dropdown: true, dropdownKey: 'users', children: [
            { label: 'Admins', icon: 'fa-user-tie', to: '/super-admin/officials' },
            { label: 'Community', icon: 'fa-users', to: '/super-admin/community' },
          ]},
          { label: 'Pets', icon: 'fa-paw', to: '/super-admin/pets' },
          { label: 'Activity Logs', icon: 'fa-clipboard-list', to: '/super-admin/activity-logs' },
        ];
      case 'barangay_official':
        return [
          { label: 'Dashboard', icon: 'fa-home', to: '/admin/dashboard' },
          { label: 'Pets', icon: 'fa-paw', dropdown: true, dropdownKey: 'pets', children: [
            { label: 'Pets', icon: 'fa-dog', to: '/admin/pets' },
            { label: 'Vet Cards', icon: 'fa-id-card', to: '/admin/vet-cards' },
          ]},
          { label: 'Community', icon: 'fa-users', to: '/admin/community', badge: pendingVerifCount },
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

  const roleConfig = {
    super_admin: { name: 'Super Admin', color: '#ef4444', icon: 'fa-crown' },
    barangay_official: { name: 'Barangay Admin', color: '#ffc107', icon: 'fa-shield-alt' },
    
    private_clinic: { name: 'Private Clinic', color: '#22c55e', icon: 'fa-hospital' },
  };
  const role = user ? roleConfig[user.role] : null;

  // ─── Verification handlers ───────────────────────────────────────────────

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
      background: 'transparent',
      color: anyChildActive ? activeText : (darkMode ? '#bbbbbb' : '#333333'),
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
            color: anyChildActive ? '#e0a800' : (darkMode ? '#888888' : '#666666'),
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
                    background: childActive ? activeBg : 'transparent',
                    color: childActive ? activeText : (darkMode ? '#bbbbbb' : '#444444'),
                    fontWeight: childActive ? '700' : '500',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s',
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
                    color: childActive ? '#e0a800' : (darkMode ? '#888' : '#777'),
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
    background: active ? activeBg : 'transparent',
    color: active ? activeText : (darkMode ? '#bbbbbb' : '#333333'),
    fontWeight: active ? '700' : '500',
    fontSize: '0.875rem',
    textDecoration: 'none',
    justifyContent: collapsed ? 'center' : 'flex-start',
    position: 'relative',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  };

  const iconStyle = {
    fontSize: '0.95rem',
    width: '18px',
    textAlign: 'center',
    flexShrink: 0,
    color: active ? '#e0a800' : (darkMode ? '#888888' : '#666666'),
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
      {active && <span className="sb-active-bar" />}
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
        .sb-active-bar { position: absolute; left: 0; top: 9px; bottom: 9px; width: 3px; border-radius: 0 3px 3px 0; background: #ffc107; animation: sbBar 0.25s ease-out; }
        @keyframes sbBar { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes sbFade { from { opacity: 0; } to { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .sb-active-bar, .sb-tab.active::before { animation: none !important; } }
        nav::-webkit-scrollbar { display: none; }
        @media (max-width: 991px) {
          .sidebar-desktop { display: none !important; }
          .sidebar-spacer  { display: none !important; }
          .sidebar-bottom-bar { display: flex !important; }
          .top-navbar-bar { left: 0 !important; top: 0 !important; height: 64px !important; padding-right: 0.75rem !important; gap: 0.4rem !important; }
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
          height: '64px',
          background: darkMode ? '#0d0d0d' : '#ffffff',
          borderBottom: `1px solid ${border}`,
          backdropFilter: 'none',
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

          

          {/* QR Scanner — mobile only, community only */}
          {user?.role === 'pet_owner' && (
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
                dialogClassName="qs-dialog"
                contentClassName="qs-content"
                style={{ zIndex: 99999 }}
                aria-labelledby="qs-title"
              >
                <div className="qs-head">
                  <div className="qs-head-ic"><i className="fas fa-qrcode" /></div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="qs-kicker">QR scanner</div>
                    <h5 id="qs-title" className="qs-title">{scanResult ? 'Pet found' : 'Scan a pet QR code'}</h5>
                  </div>
                  <button type="button" className="qs-close" onClick={() => setShowScannerModal(false)} aria-label="Close">
                    <i className="fas fa-times" />
                  </button>
                </div>
                <Modal.Body className="qs-body">
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
                            <div className="qs-pet">
                              <div className="qs-pet-av">
                                <img src={speciesIcon} alt={data.species} onError={e => e.target.style.display = 'none'} />
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div className="qs-pet-name">{data.name}</div>
                                <div className="qs-pet-meta">{[data.species, data.reg_no].filter(Boolean).join(' · ')}</div>
                              </div>
                              <span className="qs-chip"><i className="fas fa-check-circle" />Verified</span>
                            </div>

                            {/* Details */}
                            <div className="qs-grid">
                              {rows.filter(r => r.label !== 'Registration No.').map((row) => (
                                <div key={row.label} className={`qs-info${['Owner', 'Barangay', 'Issued By', 'Microchip No.'].includes(row.label) ? ' wide' : ''}`}>
                                  <div className="qs-info-label">{row.label}</div>
                                  <div className="qs-info-value" style={{ textTransform: ['Species','Gender','Sterilized'].includes(row.label) ? 'capitalize' : 'none' }}>{row.value}</div>
                                </div>
                              ))}
                            </div>

                            <button type="button" className="qs-btn" onClick={() => setScanResult('')}>
                              <i className="fas fa-redo" />Scan again
                            </button>
                          </div>
                        );
                      } catch {
                        return (
                          <div>
                            <div className="qs-alert"><i className="fas fa-exclamation-circle" /><span>Could not read the QR code data.</span></div>
                            <button type="button" className="qs-btn" onClick={() => setScanResult('')}>
                              <i className="fas fa-redo" />Scan again
                            </button>
                          </div>
                        );
                      }
                    })()
                  ) : (
                    <div>
                      <p className="qs-hint">Point your camera at a pet's QR code.</p>

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
                            <div style={{ fontWeight: '800', fontSize: '1rem', color: '#333' }}>Scan complete!</div>
                            <div style={{ fontSize: '0.75rem', color: '#888' }}>Loading pet information...</div>
                            <div className="qs-dots"><span /><span /><span /></div>
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

                      <p className="qs-tip">
                        <i className="fas fa-lightbulb" />
                        Make sure the QR code is well lit and in frame.
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
                  if (user.role === 'pet_owner' && ownerProfile) {
                    const cfg = VERIFICATION_CONFIG[ownerProfile.verification_status] || VERIFICATION_CONFIG.not_verified;
                    return <div style={{ fontSize: '0.65rem', fontWeight: '600', color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.3px' }}><i className={`fas ${cfg.icon} me-1`} style={{ fontSize: '0.55rem' }} />{cfg.label}</div>;
                  }
                  const rc = {  barangay_official: { name: user.office_role || 'Barangay Admin', color: '#ffc107' }, private_clinic: { name: 'Private Clinic', color: '#22c55e' } };
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
  const rc = { super_admin: { name: 'Super Admin', color: '#ef4444' }, barangay_official: { name: user.office_role || 'Barangay Admin', color: '#ffc107' }, private_clinic: { name: 'Private Clinic', color: '#22c55e' } };
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

                  <div style={{ height: '1px', background: border, margin: '0.2rem 0' }} />

                  {/* Verify Account button for pet_owner */}
                  {user.role === 'pet_owner' && ownerProfile && (() => {
                    const canVerify = ownerProfile.verification_status === 'not_verified' || ownerProfile.verification_status === 'semi_verified';
                    return canVerify ? (
                      <button
                        onClick={() => { closeDropdown(); setShowVerifyModal(true); }}
                        style={{ width: '100%', padding: '0.6rem 0.75rem', background: 'transparent', border: 'none', borderRadius: '8px', color: '#ffc107', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s', marginBottom: '0.2rem' }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,193,7,0.08)'}
                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <i className="fas fa-id-card" style={{ fontSize: '0.75rem' }} />
                        Verify Account
                      </button>
                    ) : null;
                  })()}

                  {/* Update Password — super admin only */}
                  {user.role === 'super_admin' && (
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
                      <i className="fas fa-key" style={{ fontSize: '0.75rem', width: '16px', textAlign: 'center' }} />
                      Update Password
                    </button>
                  )}

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
          background: darkMode ? '#0d0d0d' : '#ffffff',
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
          <style>{`
            .sidebar-bottom-bar::-webkit-scrollbar { display: none; }
            .sb-tab { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-width: 62px; height: 56px; padding: 0 0.6rem; text-decoration: none; color: ${darkMode ? '#8b8b94' : '#7b8190'}; cursor: pointer; }
            .sb-tab i { font-size: 1.05rem; transition: transform 0.2s ease; }
            .sb-tab span { font-size: 0.62rem; font-weight: 600; white-space: nowrap; }
            .sb-tab.active { color: #e0a800; }
            .sb-tab.active span { color: ${darkMode ? '#e5e7eb' : '#1f2328'}; font-weight: 700; }
            .sb-tab.active i { transform: translateY(-1px); }
            .sb-tab.active::before { content: ''; position: absolute; top: 0; left: 50%; width: 26px; height: 3px; margin-left: -13px; border-radius: 0 0 3px 3px; background: #ffc107; animation: sbFade 0.25s ease; }
            .sb-tab .sb-tab-badge { position: absolute; top: 6px; right: 12px; background: #ef4444; color: #fff; border-radius: 999px; font-size: 0.5rem; font-weight: 700; min-width: 15px; padding: 0.05rem 0.3rem; text-align: center; line-height: 1.5; }
            .sb-tab:focus-visible { outline: 2px solid #ffc107; outline-offset: -2px; }
            .sb-tabs.fit .sb-tab { flex: 1 1 0; min-width: 0; padding: 0 0.2rem; }
            .sb-tabs.fit .sb-tab span:not(.sb-tab-badge) { max-width: 100%; overflow: hidden; text-overflow: ellipsis; }
            .sb-tabs.fit .sb-tab .sb-tab-badge { right: auto; left: calc(50% + 6px); }
          `}</style>
          {(() => {
            const tabs = links.flatMap((link, idx) => {
              if (link.dropdown) {
                return (link.children || []).map((child, cIdx) => ({
                  ...child,
                  _key: `${idx}-${cIdx}`
                }));
              }
              return [{ ...link, _key: String(idx) }];
            });
            // 5 tabs or fewer fit on any phone: share the width evenly. More than 5 (City Vet admin): scroll sideways.
            const fits = tabs.length <= 5;
            return (
          <div className={`sb-tabs${fits ? ' fit' : ''}`} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0',
            width: '100%',
            padding: '0 0.25rem',
            height: '100%',
            justifyContent: fits ? 'stretch' : 'flex-start',
            minWidth: fits ? 'unset' : 'max-content',
          }}>
            {tabs.map((link) => {
              const active = link.to ? isActive(link.to) : false;
              const inner = (
                <>
                  <i className={`fas ${link.icon}`} />
                  <span>{link.label}</span>
                  {link.badge > 0 && <span className="sb-tab-badge">{link.badge > 9 ? '9+' : link.badge}</span>}
                </>
              );
              return link.to ? (
                <Link key={link._key} to={link.to} className={`sb-tab${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>{inner}</Link>
              ) : (
                <div key={link._key} className="sb-tab" onClick={link.action}>{inner}</div>
              );
            })}
          </div>
            );
          })()}
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

             {/* ── Logout Modal ── */}
      <style>{`
        .lo-backdrop.show { opacity: 1 !important; background: ${darkMode ? 'rgba(0,0,0,0.6)' : 'rgba(17,24,39,0.45)'}; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
        .lo-dialog { max-width: 340px; }
        .modal.fade .lo-dialog { transform: scale(0.94) translateY(10px); opacity: 0; transition: transform 0.32s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease; }
        .modal.show .lo-dialog { transform: none; opacity: 1; }
        .lo-content { border: 1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'} !important; border-radius: 16px !important; overflow: hidden; background: ${darkMode ? '#141414' : '#ffffff'} !important; box-shadow: 0 30px 80px rgba(16,24,40,0.28), 0 2px 6px rgba(16,24,40,0.06) !important; }

        .lo-hero { position: relative; padding: 1.6rem 1.35rem 0.9rem; text-align: center;
          background: radial-gradient(120% 90% at 50% 0%, ${darkMode ? 'rgba(220,53,69,0.18)' : 'rgba(220,53,69,0.10)'} 0%, transparent 70%); }
        .lo-close { position: absolute; top: 10px; right: 10px; width: 28px; height: 28px; border-radius: 9px; border: none; background: transparent; color: ${darkMode ? '#7a7a7a' : '#9ca3af'}; display: flex; align-items: center; justify-content: center; transition: background 0.15s ease, color 0.15s ease; }
        .lo-close:hover { background: ${darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}; color: ${textColor}; }

        .lo-icon-wrap { position: relative; width: 52px; height: 52px; margin: 0 auto 0.9rem; }
        .lo-ring { position: absolute; inset: 0; border-radius: 50%; border: 2px solid rgba(220,53,69,0.35); animation: loPulse 2.2s ease-out infinite; }
        .lo-ring.r2 { animation-delay: 1.1s; }
        .lo-icon { position: relative; width: 52px; height: 52px; border-radius: 50%; background: linear-gradient(145deg, #ef4458 0%, #c82333 100%); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 1.15rem; box-shadow: 0 8px 18px rgba(220,53,69,0.35), inset 0 1px 0 rgba(255,255,255,0.25); animation: loPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.08s backwards; }
        .lo-icon i { transform: translateX(2px); }

        .lo-title { font-weight: 800; font-size: 1.05rem; letter-spacing: -0.01em; color: ${textColor}; margin: 0 0 0.4rem; }
        .lo-text { font-size: 0.82rem; color: ${darkMode ? '#9a9a9a' : '#6b7280'}; margin: 0 auto; max-width: 260px; line-height: 1.5; }

        .lo-foot { padding: 0.9rem 1.15rem 1.15rem; }
        .lo-actions { display: flex; gap: 0.5rem; }
        .lo-btn { position: relative; flex: 1; height: 40px; border-radius: 10px; font-weight: 700; font-size: 0.85rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; border: 1px solid transparent; overflow: hidden; transition: background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease, border-color 0.18s ease; }
        .lo-btn:active:not(:disabled) { transform: scale(0.98); }
        .lo-btn.stay { background: ${darkMode ? '#1c1c1c' : '#f6f7f9'}; border-color: ${darkMode ? '#2a2a2a' : '#eceef1'}; color: ${textColor}; }
        .lo-btn.stay:hover:not(:disabled) { background: ${darkMode ? '#242424' : '#eef0f3'}; }
        .lo-btn.out { background: linear-gradient(135deg, #e5404f 0%, #c82333 100%); color: #fff; box-shadow: 0 6px 16px rgba(220,53,69,0.28); }
        .lo-btn.out:hover:not(:disabled) { box-shadow: 0 10px 24px rgba(220,53,69,0.38); transform: translateY(-1px); }
        .lo-btn.out::after { content: ''; position: absolute; top: 0; left: -60%; width: 50%; height: 100%; background: linear-gradient(100deg, transparent, rgba(255,255,255,0.28), transparent); transform: skewX(-20deg); transition: left 0.6s ease; }
        .lo-btn.out:hover:not(:disabled)::after { left: 120%; }
        .lo-btn.out .arrow { transition: transform 0.2s ease; }
        .lo-btn.out:hover:not(:disabled) .arrow { transform: translateX(3px); }
        .lo-btn:disabled { opacity: 0.85; cursor: default; }
        .lo-btn:focus-visible, .lo-close:focus-visible { outline: 2px solid #dc3545; outline-offset: 2px; }
        .lo-spin { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff; animation: loSpin 0.7s linear infinite; }

        /* QR scanner modal */
        .qs-dialog { max-width: 420px; }
        .qs-content { border: 1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)'} !important; border-radius: 16px !important; overflow: hidden; background: ${darkMode ? '#141414' : '#ffffff'} !important; box-shadow: 0 30px 80px rgba(16,24,40,0.28) !important; }
        .qs-head { display: flex; align-items: center; gap: 0.8rem; padding: 1.1rem 1.25rem; border-bottom: 1px solid ${darkMode ? 'rgba(255,255,255,0.07)' : '#eef0f3'}; background: linear-gradient(180deg, ${darkMode ? 'rgba(255,193,7,0.08)' : '#fffbeb'} 0%, ${darkMode ? '#141414' : '#fff'} 100%); }
        .qs-head-ic { width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; color: #e0a800; background: rgba(255,193,7,0.16); }
        .qs-kicker { font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #b88a00; }
        .qs-title { font-size: 1.08rem; font-weight: 700; color: ${textColor}; margin: 0; }
        .qs-close { width: 30px; height: 30px; border-radius: 9px; border: none; background: transparent; color: ${darkMode ? '#7a7a7a' : '#9ca3af'}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .qs-close:hover { background: ${darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}; color: ${textColor}; }
        .qs-body { padding: 1.15rem 1.25rem 1.25rem !important; max-height: 75vh; overflow-y: auto; }
        .qs-hint { font-size: 0.84rem; color: ${darkMode ? '#9a9a9a' : '#6b7280'}; margin: 0 0 0.9rem; text-align: center; }
        .qs-tip { display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.74rem; color: ${darkMode ? '#7a7a7a' : '#9ca3af'}; margin: 0.8rem 0 0; text-align: center; }
        .qs-tip i { color: #ffc107; }
        .qs-pet { display: flex; align-items: center; gap: 0.75rem; padding: 0.8rem 0.9rem; border-radius: 12px; border: 1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : '#eef0f3'}; background: ${darkMode ? '#1b1b1b' : '#fafbfc'}; margin-bottom: 0.75rem; }
        .qs-pet-av { width: 46px; height: 46px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: rgba(255,193,7,0.16); }
        .qs-pet-av img { width: 30px; height: 30px; object-fit: contain; }
        .qs-pet-name { font-weight: 700; font-size: 1rem; color: ${textColor}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .qs-pet-meta { font-size: 0.76rem; color: ${darkMode ? '#9a9a9a' : '#6b7280'}; text-transform: capitalize; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .qs-chip { display: inline-flex; align-items: center; gap: 0.3rem; flex-shrink: 0; font-size: 0.68rem; font-weight: 700; padding: 0.2rem 0.6rem; border-radius: 999px; background: rgba(25,135,84,0.12); color: #198754; }
        .qs-grid { display: grid; grid-template-columns: 1fr 1fr; grid-auto-flow: row dense; gap: 0.45rem; margin-bottom: 1rem; }
        .qs-info { padding: 0.55rem 0.7rem; border-radius: 10px; border: 1px solid ${darkMode ? 'rgba(255,255,255,0.08)' : '#eef0f3'}; min-width: 0; }
        .qs-info.wide { grid-column: 1 / -1; }
        .qs-info-label { font-size: 0.64rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: ${darkMode ? '#7a7a7a' : '#9ca3af'}; }
        .qs-info-value { font-size: 0.86rem; font-weight: 600; color: ${textColor}; word-break: break-word; }
        .qs-btn { width: 100%; height: 42px; border: none; border-radius: 10px; background: #ffc107; color: #1f2328; font-weight: 700; font-size: 0.88rem; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem; transition: background 0.15s ease, box-shadow 0.15s ease; }
        .qs-btn:hover { background: #f0b400; box-shadow: 0 6px 16px rgba(255,193,7,0.35); }
        .qs-btn:focus-visible, .qs-close:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }
        .qs-alert { display: flex; align-items: flex-start; gap: 0.55rem; padding: 0.75rem 0.9rem; border-radius: 10px; font-size: 0.86rem; margin-bottom: 1rem; background: rgba(220,53,69,0.07); border: 1px solid rgba(220,53,69,0.25); color: #dc3545; }
        .qs-alert i { margin-top: 3px; }
        .qs-dots { display: flex; gap: 5px; }
        .qs-dots span { width: 7px; height: 7px; border-radius: 50%; background: #ffc107; animation: qsDot 1s ease-in-out infinite; }
        .qs-dots span:nth-child(2) { animation-delay: 0.15s; }
        .qs-dots span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes qsDot { 0%, 80%, 100% { transform: scale(0.6); opacity: 0.5; } 40% { transform: scale(1); opacity: 1; } }
        @media (max-width: 576px) {
          .qs-dialog { margin: 1rem auto; max-width: calc(100% - 2rem); }
          .qs-head { padding: 0.95rem 1rem; }
          .qs-body { padding: 1rem !important; }
        }
        @keyframes loPulse { 0% { transform: scale(1); opacity: 0.9; } 100% { transform: scale(1.65); opacity: 0; } }
        @keyframes loPop { 0% { transform: scale(0.4); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes loSpin { to { transform: rotate(360deg); } }
        @media (max-width: 576px) {
          .lo-dialog { margin: 1rem auto; max-width: calc(100% - 2rem); }
        }
        @media (prefers-reduced-motion: reduce) {
          .lo-ring, .lo-icon, .lo-spin { animation: none !important; }
          .modal.fade .lo-dialog { transition: none; }
        }
      `}</style>
      <Modal
        show={showLogoutModal}
        onHide={() => { if (!loggingOut) setShowLogoutModal(false); }}
        centered
        dialogClassName="lo-dialog"
        contentClassName="lo-content"
        backdropClassName="lo-backdrop"
        style={{ zIndex: 99999 }}
        aria-labelledby="logout-title"
      >
        <div className="lo-hero">
          <button type="button" className="lo-close" onClick={() => setShowLogoutModal(false)} disabled={loggingOut} aria-label="Close">
            <i className="fas fa-times" />
          </button>
          <div className="lo-icon-wrap">
            <span className="lo-ring" />
            <span className="lo-ring r2" />
            <div className="lo-icon"><i className="fas fa-sign-out-alt" /></div>
          </div>
          <h5 id="logout-title" className="lo-title">Log out of PetUnity?</h5>
          <p className="lo-text">You'll be signed out on this device and will need to log in again to continue.</p>
        </div>

        <div className="lo-foot">
          <div className="lo-actions">
            <button type="button" className="lo-btn stay" onClick={() => setShowLogoutModal(false)} disabled={loggingOut}>
              Stay signed in
            </button>
            <button
              type="button"
              className="lo-btn out"
              disabled={loggingOut}
              onClick={() => {
                setLoggingOut(true);
                setTimeout(() => {
                  setShowLogoutModal(false);
                  setLoggingOut(false);
                  onLogout();
                  navigate('/login');
                }, 600);
              }}
            >
              {loggingOut
                ? <><span className="lo-spin" />Logging out…</>
                : <>Log out<i className="fas fa-arrow-right arrow" style={{ fontSize: '0.8rem' }} /></>}
            </button>
          </div>
        </div>
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