import React from 'react';

const NotFound = () => {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '8rem', fontWeight: '900', color: '#333', lineHeight: 1, margin: 0 }}>404</h1>
      <h2 style={{ fontWeight: '600', color: '#555', marginBottom: '0.5rem' }}>Page Not Found</h2>
      <p style={{ color: '#999', maxWidth: '400px' }}>
        The page you are looking for doesn't exist.
      </p>
    </div>
  );
};

export default NotFound;