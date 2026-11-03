import React, { useState, useEffect } from 'react';
import { Modal, Button } from 'react-bootstrap';

const SessionInvalidatedModal = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = () => setShow(true);
    window.addEventListener('session_invalidated', handler);
    return () => window.removeEventListener('session_invalidated', handler);
  }, []);

  const handleGoToLogin = () => {
    setShow(false);
    window.location.href = '/login';
  };

  return (
    <Modal
      show={show}
      onHide={() => {}}
      backdrop="static"
      keyboard={false}
      centered
      style={{ zoom: '0.75', zIndex: 99999 }}
    >
      <Modal.Body style={{
        padding: '2.5rem',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        borderRadius: '20px',
        border: '1px solid rgba(239,68,68,0.2)',
      }}>
        <div className="text-center mb-4">
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(239,68,68,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
            border: '3px solid rgba(239,68,68,0.3)',
            boxShadow: '0 8px 24px rgba(239,68,68,0.15)',
          }}>
            <i className="fas fa-shield-alt" style={{ fontSize: '2.2rem', color: '#ef4444' }} />
          </div>
          <h5 style={{ fontWeight: '700', color: '#212529', marginBottom: '0.75rem', fontSize: '1.3rem' }}>
            Session Ended
          </h5>
          <p style={{ fontSize: '1rem', color: '#6c757d', lineHeight: '1.6', marginBottom: 0 }}>
            Your account was signed in from another device. You have been logged out for security.
          </p>
        </div>
        <div className="d-flex justify-content-center">
          <Button
            onClick={handleGoToLogin}
            style={{
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              border: 'none', color: '#fff',
              borderRadius: '12px', padding: '0.75rem 2rem',
              fontWeight: '700', fontSize: '1rem',
              boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
            }}
          >
            <i className="fas fa-sign-in-alt me-2" />Go to Login
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default SessionInvalidatedModal;