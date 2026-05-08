import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

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
import { getToken, getUser, removeAuth } from './utils/auth';

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
    case 'pet_owner': return '/owner/dashboard';
    case 'private_clinic': return '/clinic/dashboard';
    default: return '/login';
  }
};
function SidebarLayout({ user, onLogout, darkMode, setDarkMode, handleLogin }) {
  const location = useLocation();
  const hiddenRoutes = ['/vet-card-view/', '/login', '/register', '/edit-profile'];
  const isLandingPage = location.pathname === '/';
  const hasSidebar = !isLandingPage && !hiddenRoutes.some(r => location.pathname.includes(r));

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
        <div style={{ height: '56px', flexShrink: 0 }} />
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
// Pages that use full-width layout (no sidebar)
const FULL_PAGE_PATHS = ['/login', '/register', '/vet-card-view/', '/edit-profile'];

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
        <Route path="/super-admin/dashboard" element={user?.role === 'super_admin' ? <SuperAdminDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/super-admin/barangays" element={user?.role === 'super_admin' ? <BarangayManagement /> : <Navigate to="/login" replace />} />
        <Route path="/super-admin/officials" element={user?.role === 'super_admin' ? <OfficialManagement /> : <Navigate to="/login" replace />} />
        <Route path="/super-admin/pets" element={user?.role === 'super_admin' ? <SuperAdminPetManagement /> : <Navigate to="/login" replace />} />
        <Route path="/super-admin/owners" element={user?.role === 'super_admin' ? <SuperAdminOwnerManagement /> : <Navigate to="/login" replace />} />
        <Route path="/super-admin/clinics" element={user?.role === 'super_admin' ? <ClinicManagement /> : <Navigate to="/login" replace />} />

        {/* Barangay Official */}
        <Route path="/admin/dashboard" element={user?.role === 'barangay_official' ? <AdminDashboard darkMode={darkMode} /> : <Navigate to="/login" replace />} />
        <Route path="/admin/pets" element={user?.role === 'barangay_official' ? <PetManagement darkMode={darkMode} /> : <Navigate to="/login" replace />} />
        <Route path="/admin/owners" element={user?.role === 'barangay_official' ? <AdminOwnerManagement /> : <Navigate to="/login" replace />} />
        <Route path="/admin/vaccinations" element={user?.role === 'barangay_official' ? <RecordManagement /> : <Navigate to="/login" replace />} />
        <Route path="/admin/schedules" element={user?.role === 'barangay_official' ? <Scheduling /> : <Navigate to="/login" replace />} />
        <Route path="/admin/vet-cards" element={user?.role === 'barangay_official' ? <VetCardManagement /> : <Navigate to="/login" replace />} />
        <Route path="/admin/reports" element={user?.role === 'barangay_official' ? <ReportManagement /> : <Navigate to="/login" replace />} />
        <Route path="/admin/map-status" element={user?.role === 'barangay_official' ? <MapStatus /> : <Navigate to="/login" replace />} />
        <Route path="/admin/inventory" element={user?.role === 'barangay_official' ? <InventoryManagement /> : <Navigate to="/login" replace />} />
        <Route path="/admin/clinics" element={user?.role === 'barangay_official' ? <ClinicManagement /> : <Navigate to="/login" replace />} />

        {/* Pet Owner */}
        <Route path="/owner/dashboard" element={user?.role === 'pet_owner' ? <OwnerDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/owner/pet-status" element={user?.role === 'pet_owner' ? <PetStatus /> : <Navigate to="/login" replace />} />
        <Route path="/owner/schedule" element={user?.role === 'pet_owner' ? <OwnerSchedule /> : <Navigate to="/login" replace />} />
        <Route path="/owner/vet-card" element={user?.role === 'pet_owner' ? <VetCard /> : <Navigate to="/login" replace />} />
        <Route path="/owner/reports" element={user?.role === 'pet_owner' ? <Reports /> : <Navigate to="/login" replace />} />
        <Route path="/vet-card-view/:petId" element={<VetCardView />} />
        <Route path="/owner/map-status" element={user?.role === 'pet_owner' ? <OwnerMapStatus /> : <Navigate to="/login" replace />} />
        
        {/* Clinic */}
        <Route path="/clinic/dashboard" element={user?.role === 'private_clinic' ? <ClinicDashboard /> : <Navigate to="/login" replace />} />
        <Route path="/clinic/records" element={<ClinicRecordManagement />} />
        <Route path="/clinic/reports" element={user?.role === 'private_clinic' ? <ClinicReports /> : <Navigate to="/login" replace />} />
        <Route path="/clinic/inventory" element={user?.role === 'private_clinic' ? <ClinicInventoryManagement /> : <Navigate to="/login" replace />} />

        {/* Edit Profile */}
        <Route path="/edit-profile" element={user ? <EditProfile darkMode={darkMode} /> : <Navigate to="/login" replace />} />

        {/* 404 */}
        <Route path="*" element={user ? <Navigate to={getDashboardRoute(user.role)} replace /> : <Navigate to="/" replace />} />
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

  const handleLogin = (userData) => {
    setIsLoggingIn(true);
    setTimeout(() => { setUser(userData); setIsLoggingIn(false); }, 3000);
  };

  const handleLogout = () => { removeAuth(); setUser(null); };

  useEffect(() => {
    document.body.style.background = darkMode ? '#0f0f0f' : '#ffffff';
    document.body.style.transition = 'background 0.3s ease';
  }, [darkMode]);

  if (isLoggingIn) return <Loading message="Welcome back! Setting up your dashboard..." />;

  return (
    <Router>
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
        <SidebarLayout user={user} onLogout={handleLogout} darkMode={darkMode} setDarkMode={setDarkMode} handleLogin={handleLogin} />
      </div>
    </Router>
  );
}

export default App;