import React, { useState, useEffect, useRef } from 'react';

const Loading = ({ message = 'Loading...' }) => {
  const [progress, setProgress] = useState(0);
  const [currentModule, setCurrentModule] = useState(0);
  const trackRef = useRef(null);

  const messages = [
    'Initializing system...',
    'Loading pet records...',
    'Syncing vaccination data...',
    'Preparing dashboard...',
    'Almost ready!'
  ];

  useEffect(() => {
  const duration = 3000;
  const interval = 30;
  const increment = (100 / duration) * interval;

  const timer = setInterval(() => {
    setProgress(prev => {
      const next = Math.min(prev + increment, 100);
      const moduleIndex = Math.min(
        Math.floor((next / 100) * messages.length),
        messages.length - 1
      );
      setCurrentModule(moduleIndex);
      return next;
    });
  }, interval);

  return () => clearInterval(timer);
}, []);

  return (
    <div style={{
      background: '#ffffff',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'fixed',
      inset: 0,
      zIndex: 9999
    }}>
      <style>{`
        @keyframes bodyBob {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50%       { transform: translateY(-4px) rotate(2deg); }
        }
        @keyframes tailWag {
          0%, 100% { transform: rotate(-20deg); }
          50%       { transform: rotate(20deg); }
        }
        @keyframes earFlap {
          0%, 100% { transform: rotate(-10deg); }
          50%       { transform: rotate(10deg); }
        }
        @keyframes legFront {
          0%, 100% { transform: rotate(-25deg); }
          50%       { transform: rotate(25deg); }
        }
        @keyframes legBack {
          0%        { transform: rotate(20deg); }
          50%       { transform: rotate(-30deg); }
          100%      { transform: rotate(20deg); }
        }
        @keyframes slideRight {
          0%   { transform: translateX(-80px); }
          100% { transform: translateX(560px); }
        }
        @keyframes pawPrint {
          0%   { opacity: 0; transform: scale(0.5); }
          20%  { opacity: 1; transform: scale(1); }
          80%  { opacity: 0.6; }
          100% { opacity: 0; }
        }
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95%           { transform: scaleY(0.1); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes legF1 {
          0%,100%{transform:rotate(-28deg)} 50%{transform:rotate(28deg)}
        }
        @keyframes legF2 {
          0%,100%{transform:rotate(28deg)} 50%{transform:rotate(-28deg)}
        }
        @keyframes legB1 {
          0%,100%{transform:rotate(24deg)} 50%{transform:rotate(-24deg)}
        }
        @keyframes legB2 {
          0%,100%{transform:rotate(-24deg)} 50%{transform:rotate(24deg)}
        }
        @keyframes pawPrint {
          0%{opacity:0;transform:scale(0.4)} 15%{opacity:1;transform:scale(1)} 70%{opacity:0.5} 100%{opacity:0}
        }
      `}</style>

      <div style={{
        textAlign: 'center',
        width: '100%',
        maxWidth: '440px',
        padding: '0 1.5rem',
        animation: 'fadeSlideIn 0.5s ease'
      }}>

        <h2 
          style={{ 
            color: '#ffffff',
            fontWeight: '800',
            marginBottom: '2rem',
            fontSize: 'clamp(1.6rem, 5vw, 2.5rem)',
            letterSpacing: '1px'
          }}
        >
          <span style={{ color: '#ffc107' }}>Pet</span>
          <span style={{ color: '#1a1a1a' }}>Unity</span>
        </h2>

        {/* Dog running track */}
        <div ref={trackRef} style={{ position: 'relative', height: '80px', marginBottom: '1.25rem', overflow: 'hidden', maxWidth: '100%' }}>
          <div style={{ position: 'absolute', bottom: '12px', left: 0, right: 0, height: '1px', background: '#f3f4f6' }} />

          {[0, 0.4, 0.8].map((delay, i) => (
            <div key={i} style={{
              position: 'absolute', bottom: '14px',
              left: `${Math.max(0, (progress / 100) * 85 - 15 + i * 28)}%`,
              opacity: 0,
              animation: `pawPrint 1.6s ease ${delay}s infinite`
            }}>
              <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                <ellipse cx="6" cy="6.5" rx="3" ry="2.2" fill="#fbbf24" opacity=".55"/>
                <circle cx="2.5" cy="3" r="1.1" fill="#fbbf24" opacity=".55"/>
                <circle cx="9.5" cy="3" r="1.1" fill="#fbbf24" opacity=".55"/>
                <circle cx="4.8" cy="1.2" r="1" fill="#fbbf24" opacity=".55"/>
                <circle cx="7.2" cy="1.2" r="1" fill="#fbbf24" opacity=".55"/>
              </svg>
            </div>
          ))}

          {/* Dog — position synced to progress */}
          <div style={{
            position: 'absolute', bottom: '12px',
            left: `calc(${progress}% - ${progress * 0.64}px)`,
            transition: 'left 0.12s linear'
          }}>
            <svg width="64" height="48" viewBox="0 0 64 48" fill="none">
              <g style={{ transformOrigin: '7px 19px', animation: 'tailWag 0.28s ease-in-out infinite' }}>
                <path d="M7 19 Q1 12 5 5" stroke="#d97706" strokeWidth="3.2" strokeLinecap="round" fill="none"/>
                <circle cx="5" cy="5" r="2" fill="#fbbf24"/>
              </g>
              <g style={{ transformOrigin: '32px 24px', animation: 'bodyBob 0.28s ease-in-out infinite' }}>
                <g style={{ transformOrigin: '20px 30px', animation: 'legB1 0.28s ease-in-out infinite' }}>
                  <rect x="17" y="30" width="4.5" height="12" rx="2.2" fill="#d97706"/>
                  <rect x="14.5" y="40" width="8" height="3.5" rx="1.8" fill="#b45309"/>
                </g>
                <g style={{ transformOrigin: '26px 30px', animation: 'legB2 0.28s ease-in-out infinite' }}>
                  <rect x="23" y="30" width="4.5" height="12" rx="2.2" fill="#d97706"/>
                  <rect x="20.5" y="40" width="8" height="3.5" rx="1.8" fill="#b45309"/>
                </g>
                <ellipse cx="32" cy="24" rx="16.5" ry="11" fill="#fbbf24"/>
                <ellipse cx="30" cy="28" rx="7" ry="4.5" fill="#fde68a"/>
                <g style={{ transformOrigin: '42px 28px', animation: 'legF1 0.28s ease-in-out infinite' }}>
                  <rect x="39" y="28" width="4.5" height="12" rx="2.2" fill="#d97706"/>
                  <rect x="36.5" y="38" width="8" height="3.5" rx="1.8" fill="#b45309"/>
                </g>
                <g style={{ transformOrigin: '48px 28px', animation: 'legF2 0.28s ease-in-out infinite' }}>
                  <rect x="45" y="28" width="4.5" height="12" rx="2.2" fill="#d97706"/>
                  <rect x="42.5" y="38" width="8" height="3.5" rx="1.8" fill="#b45309"/>
                </g>
                <circle cx="49" cy="14" r="12" fill="#fbbf24"/>
                <g style={{ transformOrigin: '44px 9px', animation: 'earFlap 0.28s ease-in-out infinite' }}>
                  <ellipse cx="43" cy="7" rx="5.5" ry="7.5" fill="#d97706" transform="rotate(-12 43 7)"/>
                </g>
                <g style={{ transformOrigin: '52px 12px', animation: 'blink 3.2s ease-in-out infinite' }}>
                  <circle cx="52" cy="12" r="2.8" fill="#1a1a1a"/>
                  <circle cx="53" cy="11" r="0.9" fill="white"/>
                </g>
                <ellipse cx="57" cy="17" rx="2.8" ry="1.9" fill="#1a1a1a"/>
                <circle cx="56" cy="16.5" r="0.6" fill="white" opacity=".6"/>
                <path d="M55 19.5 Q58 23.5 61 19.5" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
                <ellipse cx="46" cy="17.5" rx="2.8" ry="1.8" fill="#fca5a5" opacity=".45"/>
              </g>
            </svg>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', height: '6px', background: '#f3f4f6', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.9rem' }}>
          <div style={{ height: '100%', width: `${Math.round(progress)}%`, background: '#fbbf24', borderRadius: '999px', transition: 'width 0.12s linear' }} />
        </div>

        {/* Percentage */}
        <p style={{ fontSize: 'clamp(16px, 4vw, 20px)', fontWeight: '700', color: '#1a1a1a', margin: '0 0 0.3rem', lineHeight: 1 }}>
          {Math.round(progress)}%
        </p>

        {/* Status message */}
        <p style={{ fontSize: 'clamp(11px, 3vw, 12px)', color: '#9ca3af', margin: 0 }}>
          {messages[currentModule]}
        </p>

      </div>
    </div>
  );
};

export default Loading;