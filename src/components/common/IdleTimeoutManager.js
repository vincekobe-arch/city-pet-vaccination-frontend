import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Modal, Button } from 'react-bootstrap';

const IDLE_LIMIT_MS = 10 * 60 * 1000;   // total time before logout: 10 minutes
const WARNING_LEAD_MS = 60 * 1000;      // show warning this long before logout: 60 seconds
const WARN_AT_MS = IDLE_LIMIT_MS - WARNING_LEAD_MS;

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

const IdleTimeoutManager = ({ user, onLogout }) => {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_LEAD_MS / 1000);

  const warnTimerRef = useRef(null);
  const logoutTimerRef = useRef(null);
  const countdownRef = useRef(null);
  const showWarningRef = useRef(false); // always holds the current value, unlike the closure below

  const clearAllTimers = useCallback(() => {
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const doLogout = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    onLogout();
  }, [clearAllTimers, onLogout]);

  const startCountdown = useCallback(() => {
    setSecondsLeft(WARNING_LEAD_MS / 1000);
    setShowWarning(true);
    showWarningRef.current = true;
    countdownRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const resetTimers = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    showWarningRef.current = false;
    warnTimerRef.current = setTimeout(startCountdown, WARN_AT_MS);
    logoutTimerRef.current = setTimeout(doLogout, IDLE_LIMIT_MS);
  }, [clearAllTimers, startCountdown, doLogout]);

  const handleStayLoggedIn = () => {
    resetTimers();
  };

  useEffect(() => {
    if (!user) return;

    // Only count activity as "staying active" while the warning isn't showing —
    // once the warning appears, only the button should reset it, so the user
    // gets a clear, deliberate choice instead of an accidental mouse twitch
    // silently dismissing the warning.
    const handleActivity = () => {
      if (!showWarningRef.current) resetTimers();
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity));
    resetTimers();

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
      clearAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) return null;

  return (
    <Modal show={showWarning} onHide={() => {}} backdrop="static" keyboard={false} centered style={{ zoom: '0.75', zIndex: 99999 }}>
      <Modal.Body style={{
        padding: '2.5rem',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        borderRadius: '20px',
        border: '1px solid rgba(217,119,6,0.2)',
      }}>
        <div className="text-center mb-4">
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: 'rgba(217,119,6,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.25rem',
            border: '3px solid rgba(217,119,6,0.3)',
            boxShadow: '0 8px 24px rgba(217,119,6,0.15)',
          }}>
            <i className="fas fa-hourglass-half" style={{ fontSize: '2.2rem', color: '#d97706' }} />
          </div>
          <h5 style={{ fontWeight: '700', color: '#212529', marginBottom: '0.75rem', fontSize: '1.3rem' }}>
            Still there?
          </h5>
          <p style={{ fontSize: '1rem', color: '#6c757d', lineHeight: '1.6', marginBottom: 0 }}>
            You'll be logged out in <strong>{secondsLeft}</strong> second{secondsLeft !== 1 ? 's' : ''} due to inactivity.
          </p>
        </div>
        <div className="d-flex justify-content-center gap-2">
          <Button
            onClick={handleStayLoggedIn}
            style={{
              background: 'linear-gradient(135deg, #d97706, #b45309)',
              border: 'none', color: '#fff',
              borderRadius: '12px', padding: '0.75rem 2rem',
              fontWeight: '700', fontSize: '1rem',
              boxShadow: '0 4px 14px rgba(217,119,6,0.35)',
            }}
          >
            Stay Logged In
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default IdleTimeoutManager;