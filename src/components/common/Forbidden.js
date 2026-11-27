import React, { useEffect } from 'react';

const Forbidden = () => {
  // Hide the sidebar, top bar and bottom nav while this page is shown (same as the 404 page)
  useEffect(() => {
    window.__puNotFound = true;
    window.dispatchEvent(new Event('pu:notfound'));
    return () => {
      window.__puNotFound = false;
      window.dispatchEvent(new Event('pu:found'));
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 10002,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#fff',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '8rem', fontWeight: '900', color: '#333', lineHeight: 1, margin: 0 }}>403</h1>
      <h2 style={{ fontWeight: '600', color: '#555', marginBottom: '0.5rem' }}>Access Denied</h2>
      <p style={{ color: '#999', maxWidth: '400px' }}>
        You don't have permission to view this page.
      </p>
    </div>
  );
};

export default Forbidden;