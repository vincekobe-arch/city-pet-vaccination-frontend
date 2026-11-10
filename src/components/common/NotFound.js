import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser } from '../../utils/auth';

const NotFound = () => {
  const navigate = useNavigate();
  const user = getUser();

  const getDashboard = (role) => {
    switch (role) {
      case 'super_admin': return '/super-admin/dashboard';
      case 'barangay_official': return '/admin/dashboard';
      case 'pet_owner': return '/community/dashboard';
      case 'private_clinic': return '/clinic/dashboard';
      default: return '/login';
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#ffffff',
      gap: '1rem',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <i className="fas fa-paw" style={{ fontSize: '5rem', color: '#ffc107' }}></i>
      <h1 style={{ fontSize: '6rem', fontWeight: '900', color: '#ffc107', lineHeight: 1, margin: 0 }}>404</h1>
      <h2 style={{ fontWeight: '700', color: '#333', marginBottom: '0.25rem' }}>Page Not Found</h2>
      <p style={{ color: '#888', maxWidth: '400px', marginBottom: '1.5rem' }}>
        Oops! The page you're looking for doesn't exist or you don't have permission to access it.
      </p>
      <button
        onClick={() => navigate(user ? getDashboard(user.role) : '/login')}
        style={{
          background: '#ffc107',
          border: 'none',
          borderRadius: '12px',
          padding: '0.875rem 2rem',
          fontWeight: '700',
          fontSize: '1rem',
          color: '#000',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(255,193,7,0.4)',
          transition: 'all 0.2s'
        }}
        onMouseOver={e => { e.currentTarget.style.background = '#ffb300'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
        onMouseOut={e => { e.currentTarget.style.background = '#ffc107'; e.currentTarget.style.transform = 'translateY(0)'; }}
      >
        <i className="fas fa-home me-2"></i>
        {user ? 'Go to Dashboard' : 'Go to Login'}
      </button>
    </div>
  );
};

export default NotFound;