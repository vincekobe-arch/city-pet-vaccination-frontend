import React, { useState, useEffect } from 'react';

// Same screen time as before: the bar fills from 0 to 100% in 1.5 seconds.
const DURATION = 1500;
const TICK = 20;

const MESSAGES = [
  'Initializing system...',
  'Loading pet records...',
  'Syncing vaccination data...',
  'Preparing dashboard...',
  'Almost ready!',
];

// Positions (in %) where paw prints are left behind as the dog runs
const PAW_SPOTS = [8, 20, 32, 44, 56, 68, 80];

const PawPrint = ({ size = 14, color = '#f5b301' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
    <ellipse cx="12" cy="15.5" rx="5.2" ry="4.4" />
    <ellipse cx="5.2" cy="9.6" rx="2.2" ry="2.8" />
    <ellipse cx="18.8" cy="9.6" rx="2.2" ry="2.8" />
    <ellipse cx="9" cy="5.4" rx="2" ry="2.6" />
    <ellipse cx="15" cy="5.4" rx="2" ry="2.6" />
  </svg>
);

const Loading = ({ message }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const step = (100 / DURATION) * TICK;
    const timer = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(prev + step, 100);
        if (next >= 100) clearInterval(timer);
        return next;
      });
    }, TICK);
    return () => clearInterval(timer);
  }, []);

  const pct = Math.round(progress);
  const msgIndex = Math.min(Math.floor((progress / 100) * MESSAGES.length), MESSAGES.length - 1);
  const statusText = message && message !== 'Loading...' ? message : MESSAGES[msgIndex];

  return (
    <div className="ld-screen" role="status" aria-live="polite" aria-label={`Loading PetUnity, ${pct}%`}>
      <style>{`
        .ld-screen { position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; padding: 1.5rem;
          background: radial-gradient(ellipse at 50% 35%, #fffaeb 0%, #ffffff 55%); overflow: hidden; }
        .ld-blob { position: absolute; border-radius: 50%; filter: blur(70px); pointer-events: none; }
        .ld-wrap { position: relative; width: 100%; max-width: 420px; text-align: center; animation: ldIn 0.5s ease-out both; }

        /* Logo + wordmark */
        .ld-logo-ring { position: relative; width: 92px; height: 92px; margin: 0 auto 1rem; display: flex; align-items: center; justify-content: center; }
        .ld-logo-ring::before { content: ''; position: absolute; inset: 0; border-radius: 50%; background: rgba(255,193,7,0.14); animation: ldPulse 1.6s ease-out infinite; }
        .ld-logo-ring::after { content: ''; position: absolute; inset: 10px; border-radius: 50%; background: #fff; box-shadow: 0 8px 24px rgba(224,168,0,0.18); }
        .ld-logo { position: relative; z-index: 1; width: 52px; height: 52px; object-fit: contain; animation: ldBounce 1.2s ease-in-out infinite; }
        .ld-logo-fallback { position: relative; z-index: 1; color: #f5b301; animation: ldBounce 1.2s ease-in-out infinite; }
        .ld-word { font-weight: 800; font-size: clamp(1.7rem, 6vw, 2.2rem); letter-spacing: 0.3px; margin: 0; line-height: 1.1; }
        .ld-word .p { color: #ffc107; } .ld-word .u { color: #1f2328; }
        .ld-tag { font-size: 0.8rem; color: #9ca3af; margin: 0.3rem 0 1.6rem; font-weight: 500; }

        /* Track */
        .ld-track { position: relative; height: 70px; margin: 0 0.25rem 0.9rem; }
        .ld-ground { position: absolute; left: 0; right: 0; bottom: 10px; height: 2px; border-radius: 2px;
          background: repeating-linear-gradient(90deg, #eceef1 0 10px, transparent 10px 18px); }
        .ld-paw { position: absolute; bottom: 14px; transform: translateX(-50%) rotate(90deg); opacity: 0; transition: opacity 0.35s ease; }
        .ld-paw.on { opacity: 0.55; animation: ldPawPop 0.35s ease-out; }
        .ld-paw.alt { bottom: 20px; }
        .ld-dog { position: absolute; bottom: 10px; transition: left 0.12s linear; }
        .ld-shadow { position: absolute; left: 50%; bottom: -3px; width: 40px; height: 6px; margin-left: -20px; border-radius: 50%; background: rgba(0,0,0,0.08); animation: ldShadow 0.28s ease-in-out infinite; }
        .ld-bone { position: absolute; right: -4px; bottom: 12px; opacity: 0.9; transition: transform 0.3s ease; }
        .ld-bone.got { transform: scale(0) rotate(90deg); }

        /* Progress */
        .ld-bar { position: relative; height: 10px; border-radius: 999px; background: #f3f4f6; overflow: hidden; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05); }
        .ld-fill { position: relative; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #ffd54f, #ffc107 60%, #f5b301); transition: width 0.12s linear; overflow: hidden; }
        .ld-fill::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent); transform: translateX(-100%); animation: ldShine 1s ease-in-out infinite; }
        .ld-row { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin-top: 0.7rem; }
        .ld-msg { font-size: 0.82rem; color: #6b7280; font-weight: 500; text-align: left; animation: ldMsg 0.3s ease-out; }
        .ld-pct { font-size: 1.05rem; font-weight: 800; color: #1f2328; font-variant-numeric: tabular-nums; }

        /* Dog parts */
        .ld-tail { transform-origin: 21px 25px; animation: ldTail 0.16s ease-in-out infinite; }
        .ld-body { transform-origin: 36px 30px; animation: ldBob 0.14s ease-in-out infinite; }
        .ld-legF1 { transform-origin: 41.5px 34px; animation: ldLegA 0.14s ease-in-out infinite; }
        .ld-legF2 { transform-origin: 47.5px 34px; animation: ldLegB 0.14s ease-in-out infinite; }
        .ld-legB1 { transform-origin: 23.5px 34px; animation: ldLegB 0.14s ease-in-out infinite; }
        .ld-legB2 { transform-origin: 29.5px 34px; animation: ldLegA 0.14s ease-in-out infinite; }
        .ld-ear { transform-origin: 46px 8px; animation: ldEar 0.14s ease-in-out infinite; }
        .ld-eye { transform-origin: 58.5px 13px; animation: ldBlink 3.2s ease-in-out infinite; }

        @keyframes ldIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ldPulse { 0% { transform: scale(0.85); opacity: 1; } 100% { transform: scale(1.25); opacity: 0; } }
        @keyframes ldBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes ldShine { to { transform: translateX(100%); } }
        @keyframes ldMsg { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ldPawPop { from { transform: translateX(-50%) rotate(90deg) scale(0.4); } to { transform: translateX(-50%) rotate(90deg) scale(1); } }
        @keyframes ldShadow { 0%, 100% { transform: scaleX(1); } 50% { transform: scaleX(0.82); } }
        @keyframes ldTail { 0%, 100% { transform: rotate(-14deg); } 50% { transform: rotate(16deg); } }
        @keyframes ldBob { 0%, 100% { transform: translateY(0) rotate(-2deg); } 50% { transform: translateY(-3px) rotate(2deg); } }
        @keyframes ldLegA { 0%, 100% { transform: rotate(-24deg); } 50% { transform: rotate(24deg); } }
        @keyframes ldLegB { 0%, 100% { transform: rotate(24deg); } 50% { transform: rotate(-24deg); } }
        @keyframes ldEar { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
        @keyframes ldBlink { 0%, 90%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.1); } }

        @media (max-width: 400px) {
          .ld-logo-ring { width: 80px; height: 80px; }
          .ld-logo { width: 44px; height: 44px; }
          .ld-tag { margin-bottom: 1.3rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ld-screen *, .ld-screen *::before, .ld-screen *::after { animation: none !important; }
        }
      `}</style>

      <div className="ld-blob" style={{ width: 320, height: 320, background: '#ffc107', opacity: 0.12, top: '-8%', right: '-10%' }} />
      <div className="ld-blob" style={{ width: 260, height: 260, background: '#60a5fa', opacity: 0.08, bottom: '-8%', left: '-10%' }} />

      <div className="ld-wrap">
        {/* Logo */}
        <div className="ld-logo-ring">
          <img
            className="ld-logo"
            src="/logo.png"
            alt=""
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'block'; }}
          />
          <span className="ld-logo-fallback" style={{ display: 'none' }}><PawPrint size={40} color="#f5b301" /></span>
        </div>
        <h2 className="ld-word"><span className="p">Pet</span><span className="u">Unity</span></h2>
        <p className="ld-tag">Muntinlupa City Pet Health</p>

        {/* Running dog */}
        <div className="ld-track" aria-hidden="true">
          <div className="ld-ground" />

          {PAW_SPOTS.map((spot, i) => (
            <span key={spot} className={`ld-paw${i % 2 ? ' alt' : ''}${progress > spot + 6 ? ' on' : ''}`} style={{ left: `${spot}%` }}>
              <PawPrint size={11} />
            </span>
          ))}

          {/* The bone waiting at the finish line */}
          <svg className={`ld-bone${progress >= 96 ? ' got' : ''}`} width="26" height="14" viewBox="0 0 26 14">
            <rect x="5" y="4.5" width="16" height="5" rx="2.5" fill="#e5e7eb" />
            <circle cx="5" cy="4.5" r="3.3" fill="#e5e7eb" /><circle cx="5" cy="9.5" r="3.3" fill="#e5e7eb" />
            <circle cx="21" cy="4.5" r="3.3" fill="#e5e7eb" /><circle cx="21" cy="9.5" r="3.3" fill="#e5e7eb" />
          </svg>

          <div className="ld-dog" style={{ left: `calc(${progress}% - ${progress * 0.72}px)` }}>
            <div className="ld-shadow" />
            <svg width="72" height="52" viewBox="0 0 72 52" fill="none">
              {/* Tail — drawn first so its base tucks under the body */}
              <g className="ld-tail">
                <path d="M21 25 C15 22 12 15 15 10" stroke="#e0a43a" strokeWidth="4.2" strokeLinecap="round" fill="none" />
                <path d="M15 10.5 C14.4 8.5 15.2 7.2 16.4 6.8" stroke="#fff3dc" strokeWidth="3.4" strokeLinecap="round" fill="none" />
              </g>
              <g className="ld-body">
                {/* Back legs */}
                <g className="ld-legB1">
                  <rect x="21" y="33" width="5" height="11" rx="2.5" fill="#d9952e" />
                  <ellipse cx="23.5" cy="44" rx="3.4" ry="2" fill="#fff3dc" />
                </g>
                <g className="ld-legB2">
                  <rect x="27" y="33" width="5" height="11" rx="2.5" fill="#e0a43a" />
                  <ellipse cx="29.5" cy="44" rx="3.4" ry="2" fill="#fff3dc" />
                </g>
                {/* Body */}
                <rect x="17" y="18" width="34" height="19" rx="9.5" fill="#f6c56b" />
                <ellipse cx="34" cy="33" rx="10" ry="3.6" fill="#fff3dc" />
                <ellipse cx="27" cy="22.5" rx="6" ry="4" fill="#e0a43a" opacity=".55" />
                {/* Front legs */}
                <g className="ld-legF1">
                  <rect x="39" y="33" width="5" height="11" rx="2.5" fill="#d9952e" />
                  <ellipse cx="41.5" cy="44" rx="3.4" ry="2" fill="#fff3dc" />
                </g>
                <g className="ld-legF2">
                  <rect x="45" y="33" width="5" height="11" rx="2.5" fill="#e0a43a" />
                  <ellipse cx="47.5" cy="44" rx="3.4" ry="2" fill="#fff3dc" />
                </g>
                {/* Collar + tag */}
                <rect x="45.2" y="17" width="4.4" height="15" rx="2.2" fill="#ef4444" transform="rotate(-28 47.4 24.5)" />
                <circle cx="50.8" cy="31" r="2.1" fill="#ffd54f" stroke="#c9822b" strokeWidth="0.6" />
                {/* Head */}
                <circle cx="54" cy="16" r="11.5" fill="#f6c56b" />
                <ellipse cx="62" cy="20" rx="6.8" ry="5" fill="#fff3dc" />
                <ellipse cx="67.6" cy="18" rx="2.4" ry="1.9" fill="#2b2118" />
                <circle cx="67" cy="17.4" r="0.6" fill="#fff" opacity=".7" />
                <path d="M63 22.2 Q65.5 24.6 68 22.6" stroke="#2b2118" strokeWidth="1.1" strokeLinecap="round" fill="none" />
                <path d="M64.6 23.4 Q65.4 26.6 66.8 23.4 Z" fill="#ff6b81" />
                <g className="ld-eye">
                  <circle cx="58.5" cy="13" r="2.3" fill="#2b2118" />
                  <circle cx="59.3" cy="12.2" r="0.8" fill="#fff" />
                </g>
                <ellipse cx="56.6" cy="19.2" rx="2.4" ry="1.4" fill="#ff9aa2" opacity=".6" />
                {/* Floppy ear */}
                <g className="ld-ear">
                  <path d="M47 6.5 C42 5 39 11 41.5 18 C42.5 20.5 45.5 19.5 46.5 16 C47.6 12 48.6 8.5 47 6.5 Z" fill="#c9822b" />
                </g>
              </g>
            </svg>
          </div>
        </div>

        {/* Progress */}
        <div className="ld-bar">
          <div className="ld-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="ld-row">
          <span key={statusText} className="ld-msg">{statusText}</span>
          <span className="ld-pct">{pct}%</span>
        </div>
      </div>
    </div>
  );
};

export default Loading;