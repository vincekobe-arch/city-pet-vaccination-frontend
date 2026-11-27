import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { syncServerTime, startServerTimeSync, isDeviceClockWrong, onClockChange, getClockOffset } from './utils/serverTime';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

import { authAPI } from './services/api';

// Common Components
import Sidebar from './components/common/Sidebar';   // ← renamed from Navbar
import Footer from './components/common/Footer';
import Loading from './components/common/Loading';


// Landing Page
import LandingPage from './components/LandingPage';

// Auth Components
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// Super Admin Components
import SuperAdminDashboard from './components/superadmin/Dashboard';
import BarangayManagement from './components/superadmin/BarangayManagement';
import OfficialManagement from './components/superadmin/OfficialManagement';
import SuperAdminPetManagement from './components/superadmin/PetManagement';
import SuperAdminOwnerManagement from './components/superadmin/OwnerManagement';
import ActivityLogs from './components/superadmin/ActivityLogs';
import ClinicManagement from './components/admin/ClinicManagement';

// Admin Components
import AdminDashboard from './components/admin/Dashboard';
import PetManagement from './components/admin/PetManagement';
import AdminOwnerManagement from './components/admin/OwnerManagement';
import RecordManagement from './components/admin/RecordManagement';
import Scheduling from './components/admin/Scheduling';
import InventoryManagement from './components/admin/InventoryManagement';
import VetCardManagement from './components/admin/VetCardManagement';
import MapStatus from './components/admin/MapStatus';

// Pet Owner Components
import OwnerDashboard from './components/owner/Dashboard';
import PetStatus from './components/owner/PetStatus';
import OwnerSchedule from './components/owner/Schedule';
import VetCard from './components/owner/VetCard';
import VetCardView from './components/owner/VetCardView';
import Reports from './components/owner/Reports';
import ReportManagement from './components/admin/ReportManagement';
import OwnerMapStatus from './components/owner/MapStatus';


// Clinic Components
import ClinicDashboard from './components/clinic/Dashboard';
import ClinicRecordManagement from './components/clinic/RecordManagement';
import ClinicReports from './components/clinic/Reports';
import ClinicInventoryManagement from './components/clinic/ClinicInventoryManagement'; // ← add this


import EditProfile from './components/common/EditProfile';
import PublicPetProfile from './components/common/PublicPetProfile';
import { getToken, getUser, removeAuth } from './utils/auth';
import SessionInvalidatedModal from './components/common/SessionInvalidatedModal';
import NotFound from './components/common/NotFound';
import Forbidden from './components/common/Forbidden';
import IdleTimeoutManager from './components/common/IdleTimeoutManager';

// Scroll to Top Component
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const getDashboardRoute = (role) => {
  switch (role) {
    case 'super_admin': return '/super-admin/dashboard';
    case 'barangay_official': return '/admin/dashboard';
    case 'pet_owner': return '/community/dashboard';
    case 'private_clinic': return '/clinic/dashboard';
    default: return '/login';
  }
};
function SidebarLayout({ user, onLogout, darkMode, setDarkMode, handleLogin }) {
  const location = useLocation();
  const hiddenRoutes = ['/vet-card-view/', '/login', '/register', '/edit-profile'];
const isLandingPage = location.pathname === '/';
const isKnownRoute = [
  '/super-admin/', '/admin/', '/community/', '/clinic/'
].some(r => location.pathname.startsWith(r));
const hasSidebar = !isLandingPage && !hiddenRoutes.some(r => location.pathname.includes(r)) && isKnownRoute;

  if (!hasSidebar) {
    // Landing page & auth pages: navbar sits above content, full width
    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <Sidebar user={user} onLogout={onLogout} darkMode={darkMode} setDarkMode={setDarkMode} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          <MainContent user={user} handleLogin={handleLogin} darkMode={darkMode} />
          <Footer />
        </div>
      </div>
    );
  }

  // Dashboard pages: sidebar on the left, content on the right
  return (
    <div style={{ display: 'flex', flex: 1 }}>
      <Sidebar user={user} onLogout={onLogout} darkMode={darkMode} setDarkMode={setDarkMode} />
      <div 
        style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}
        onClick={() => {
          window.dispatchEvent(new CustomEvent('closeProfileDropdown'));
        }}
      >
        <div style={{ height: '64px', flexShrink: 0 }} />
        <MainContent user={user} handleLogin={handleLogin} darkMode={darkMode} />
      </div>
    </div>
  );
}
function AppLayout({ user, onLogout, darkMode, setDarkMode, handleLogin }) {
  const location = useLocation();
  const hiddenRoutes = ['/vet-card-view/', '/login', '/register'];
  const isLandingPage = location.pathname === '/';
  const hasSidebar = !isLandingPage && !hiddenRoutes.some(r => location.pathname.includes(r));
  const sidebarWidth = hasSidebar ? '240px' : '0px';

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
      <Sidebar user={user} onLogout={onLogout} darkMode={darkMode} setDarkMode={setDarkMode} />
      {/* Spacer that matches sidebar width — pushes content right */}
      {hasSidebar && (
        <div style={{ width: sidebarWidth, flexShrink: 0, transition: 'width 0.3s cubic-bezier(0.4,0,0.2,1)' }} />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <MainContent user={user} handleLogin={handleLogin} darkMode={darkMode} />
        <Footer />
      </div>
    </div>
  );
}
// Route guard: not logged in → 404, logged in with another role → 403
const guard = (user, roles, element) => {
  if (!user) return <NotFound />;
  const allowed = Array.isArray(roles) ? roles : [roles];
  return allowed.includes(user.role) ? element : <Forbidden />;
};

// Pages that use full-width layout (no sidebar)
const FULL_PAGE_PATHS = ['/login', '/register', '/vet-card-view/', '/edit-profile', '/pet/'];

function MainContent({ user, handleLogin, darkMode }) {
  const location = useLocation();
  const isFullPage = FULL_PAGE_PATHS.some(p => location.pathname.includes(p))
    || (location.pathname === '/' && !user);

  return (
    <main
      className="flex-grow-1"
      style={{
        background: darkMode ? '#0f0f0f' : '#ffffff',
        transition: 'background 0.3s ease',
        minWidth: 0,
        flex: 1,
        ...(isFullPage ? { padding: 0 } : { paddingBottom: 'env(safe-area-inset-bottom, 0px)' }),
      }}
    >
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={user ? <Navigate to={getDashboardRoute(user.role)} replace /> : <LandingPage />} />

        {/* Auth */}
        <Route path="/login" element={user ? <Navigate to={getDashboardRoute(user.role)} replace /> : <Login onLogin={handleLogin} />} />
        <Route path="/register" element={user ? <Navigate to={getDashboardRoute(user.role)} replace /> : <Register />} />

        {/* Super Admin */}
        <Route path="/super-admin/dashboard" element={guard(user, 'super_admin', <SuperAdminDashboard />)} />
        <Route path="/super-admin/barangays" element={guard(user, 'super_admin', <BarangayManagement />)} />
        <Route path="/super-admin/admins" element={guard(user, 'super_admin', <OfficialManagement />)} />
        <Route path="/super-admin/officials" element={<Navigate to="/super-admin/admins" replace />} />
        <Route path="/super-admin/pets" element={guard(user, 'super_admin', <SuperAdminPetManagement />)} />
        <Route path="/super-admin/community" element={guard(user, 'super_admin', <SuperAdminOwnerManagement />)} />
        <Route path="/super-admin/owners" element={<Navigate to="/super-admin/community" replace />} />
        <Route path="/super-admin/activity-logs" element={guard(user, 'super_admin', <ActivityLogs />)} />
        <Route path="/super-admin/clinics" element={guard(user, 'super_admin', <ClinicManagement />)} />

        {/* Barangay Official */}
        <Route path="/admin/dashboard" element={guard(user, 'barangay_official', <AdminDashboard darkMode={darkMode} />)} />
        <Route path="/admin/pets" element={guard(user, 'barangay_official', <PetManagement darkMode={darkMode} />)} />
        <Route path="/admin/community" element={guard(user, 'barangay_official', <AdminOwnerManagement />)} />
        <Route path="/admin/owners" element={<Navigate to="/admin/community" replace />} />
        <Route path="/admin/vaccinations" element={guard(user, 'barangay_official', <RecordManagement />)} />
        <Route path="/admin/schedules" element={guard(user, 'barangay_official', <Scheduling />)} />
        <Route path="/admin/vet-cards" element={guard(user, 'barangay_official', <VetCardManagement />)} />
        <Route path="/admin/reports" element={guard(user, 'barangay_official', <ReportManagement />)} />
        <Route path="/admin/map-status" element={guard(user, 'barangay_official', <MapStatus />)} />
        <Route path="/admin/inventory" element={guard(user, 'barangay_official', <InventoryManagement />)} />
        <Route path="/admin/clinics" element={guard(user, 'barangay_official', <ClinicManagement />)} />

        {/* Pet Owner */}
        <Route path="/community/dashboard" element={guard(user, 'pet_owner', <OwnerDashboard />)} />
        <Route path="/community/pet-status" element={guard(user, 'pet_owner', <PetStatus />)} />
        <Route path="/community/schedule" element={guard(user, 'pet_owner', <OwnerSchedule />)} />
        <Route path="/community/vet-card" element={guard(user, 'pet_owner', <VetCard />)} />
        <Route path="/community/reports" element={guard(user, 'pet_owner', <Reports />)} />
        <Route path="/community/map-status" element={guard(user, 'pet_owner', <OwnerMapStatus />)} />               
        
        {/* Clinic */}
        <Route path="/clinic/dashboard" element={guard(user, 'private_clinic', <ClinicDashboard />)} />
        <Route path="/clinic/records" element={guard(user, 'private_clinic', <ClinicRecordManagement />)} />
        <Route path="/clinic/reports" element={guard(user, 'private_clinic', <ClinicReports />)} />
        <Route path="/clinic/inventory" element={guard(user, 'private_clinic', <ClinicInventoryManagement />)} />

        {/* Vet Card View (opens in a new tab from Vet Cards / My Pets) */}
        <Route path="/vet-card-view/:petId" element={user ? <VetCardView /> : <NotFound />} />

        {/* Public pet page (opened by scanning a pet QR code — no login) */}
        <Route path="/pet/:code" element={<PublicPetProfile />} />

        {/* Edit Profile */}
        <Route path="/edit-profile" element={user ? <EditProfile darkMode={darkMode} /> : <NotFound />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </main>
  );
}

function App() {
  const [user, setUser] = useState(() => {
    const token = getToken();
    const userData = getUser();
    return (token && userData) ? userData : null;
  });
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const [timeKey, setTimeKey] = useState(0);

  // Sync with Philippine server time before showing the app
  const [clockWrong, setClockWrong] = useState(() => isDeviceClockWrong());
  const [clockBannerClosed, setClockBannerClosed] = useState(false);

  useEffect(() => {
    const offsetBefore = getClockOffset();
    syncServerTime().finally(() => {
      setClockWrong(isDeviceClockWrong());
      // If the real time differs from what the page used, refresh the screens once
      if (Math.abs(getClockOffset() - offsetBefore) > 60 * 1000) setTimeKey(k => k + 1);
    });
    const stopSync = startServerTimeSync();
    const stopListen = onClockChange(() => setClockWrong(isDeviceClockWrong()));
    return () => { stopSync(); stopListen(); };
  }, []);

  // Show the banner again if the clock becomes wrong after being fixed
  useEffect(() => {
    if (clockWrong) setClockBannerClosed(false);
  }, [clockWrong]);

  const handleLogin = (userData) => {
    setIsLoggingIn(true);
    setTimeout(() => { setUser(userData); setIsLoggingIn(false); }, 1500);
  };

  const handleLogout = () => {
    removeAuth();
    // Go to the login page so a logged-out user doesn't land on a 404
    window.history.replaceState(null, '', '/login');
    setUser(null);
    setTimeKey(k => k + 1);
  };


  useEffect(() => {
    document.body.style.background = darkMode ? '#0f0f0f' : '#ffffff';
    document.body.style.transition = 'background 0.3s ease';
  }, [darkMode]);

  // Keep Hostinger API warm
  useEffect(() => {
    const ping = () => fetch('https://api.petunity-muntinlupacity.com/', {
      method: 'GET', cache: 'no-store'
    }).catch(() => {});
    ping();
    const interval = setInterval(ping, 4 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Proactively detect if this session was invalidated elsewhere
  useEffect(() => {
    if (!user) return;

    const checkSession = () => authAPI.getProfile().catch(() => {});

    // Check right away on mount/login
    checkSession();

    // Keep checking periodically while the tab is open
    const interval = setInterval(checkSession, 30 * 1000);

    // Also check immediately whenever the user switches back to this tab —
    // this is what removes the "feels like I need to reload" effect,
    // since background tabs get throttled and may delay the interval
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkSession();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user]);


  if (isLoggingIn) return <Loading message="Welcome back! Setting up your dashboard..." />;

  return (
    <Router key={timeKey}>
      <ScrollToTop />
      <div
        className="App min-vh-100"
        style={{
          display: 'flex',
          flexDirection: 'column',
          background: darkMode ? '#0f0f0f' : '#ffffff',
          transition: 'background 0.3s ease',
        }}
      >
        {/* Main layout: sidebar + content side by side */}
        {clockWrong && !clockBannerClosed && createPortal(
          <div
            role="alert"
            style={{
              position: 'fixed',
              left: '50%',
              bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
              transform: 'translateX(-50%)',
              width: 'calc(100% - 32px)',
              maxWidth: '520px',
              zIndex: 99998,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              padding: '0.9rem 1rem',
              borderRadius: '12px',
              background: darkMode ? '#2b2410' : '#fff8e1',
              border: '2px solid #ffc107',
              color: darkMode ? '#f5f5f5' : '#333333',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              fontSize: '0.88rem',
            }}
          >
            <i className="fas fa-clock" style={{ color: '#ffc107', fontSize: '1.3rem', marginTop: '2px', flexShrink: 0 }}></i>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: '0.2rem' }}>
                Your device’s date or time appears to be incorrect
              </div>
              <div style={{ opacity: 0.85 }}>
                PetUnity is using Philippine Standard Time for all records. Current PH time:{' '}
                <strong>
                  {new Date().toLocaleString('en-PH', {
                    timeZone: 'Asia/Manila',
                    month: 'long', day: 'numeric', year: 'numeric',
                    hour: 'numeric', minute: '2-digit',
                  })}
                </strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setClockBannerClosed(true)}
              aria-label="Close"
              style={{ background: 'none', border: 'none', color: 'inherit', opacity: 0.6, cursor: 'pointer', fontSize: '1rem', padding: 0, flexShrink: 0 }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>,
          document.body
        )}
        <SessionInvalidatedModal />
        {user && <IdleTimeoutManager user={user} onLogout={handleLogout} />}
      <SidebarLayout user={user} onLogout={handleLogout} darkMode={darkMode} setDarkMode={setDarkMode} handleLogin={handleLogin} />
      </div>
    </Router>
  );
}

export default App;