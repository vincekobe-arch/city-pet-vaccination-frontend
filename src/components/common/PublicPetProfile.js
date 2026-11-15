import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { petAPI } from '../../services/api';

const API_HOST = 'https://api.petunity-muntinlupacity.com';

const parseDate = (value) => {
  if (!value || value === '0000-00-00') return null;
  const d = new Date(String(value).replace(' ', 'T'));
  return isNaN(d) ? null : d;
};

const fmtDate = (value) => {
  const d = parseDate(value);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
};

const ageOf = (birth) => {
  const b = parseDate(birth);
  if (!b) return null;
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  let months = now.getMonth() - b.getMonth();
  if (now.getDate() < b.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  if (years <= 0) return `${Math.max(months, 0)} mo`;
  return months ? `${years} yr ${months} mo` : `${years} yr${years === 1 ? '' : 's'}`;
};

const dueStatus = (value) => {
  const d = parseDate(value);
  if (!d) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.round((d - today) / 86400000);
  if (days < 0) return { tone: 'over', label: 'Overdue' };
  if (days <= 30) return { tone: 'soon', label: days === 0 ? 'Due today' : `Due in ${days} day${days === 1 ? '' : 's'}` };
  return { tone: 'ok', label: 'Up to date' };
};

const photoOf = (pet) => {
  if (pet?.photo_url) return pet.photo_url.startsWith('http') ? pet.photo_url : `${API_HOST}${pet.photo_url}`;
  const s = (pet?.species || '').toLowerCase();
  return s === 'cat' ? '/cat.png' : s === 'dog' ? '/dog.png' : '/pet-default.png';
};

const PublicPetProfile = () => {
  const { code } = useParams();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Keep the whole screen white on this public page (global CSS uses a dark body)
  useEffect(() => {
    const html = document.documentElement, body = document.body;
    const prev = { html: html.style.background, body: body.style.background };
    html.style.background = '#ffffff';
    body.style.background = '#ffffff';
    return () => { html.style.background = prev.html; body.style.background = prev.body; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await petAPI.getPublic(code);
        if (!cancelled) setPet(res.data.pet);
      } catch {
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [code]);

  const styles = `
    .pp-page { min-height: 100vh; background: #ffffff; padding: 1.25rem 1rem 2.5rem; display: flex; justify-content: center; }
    .pp-wrap { width: 100%; max-width: 480px; }
    @keyframes ppIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ppShimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
    .pp-anim { animation: ppIn 0.4s ease-out backwards; animation-delay: var(--d, 0s); }

    .pp-brand { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .pp-brand-left { display: flex; align-items: center; gap: 0.55rem; text-decoration: none; }
    .pp-brand img { width: 34px; height: 34px; object-fit: contain; }
    .pp-wordmark { font-weight: 800; font-size: 1.15rem; color: #1f2328; }
    .pp-wordmark span { color: #e0a800; }
    .pp-tag { font-size: 0.72rem; font-weight: 700; color: #6b7280; background: #fff; border: 1px solid #e9ecef; padding: 0.25rem 0.6rem; border-radius: 999px; }

    .pp-card { background: #fff; border: 1px solid #e9ecef; border-radius: 18px; box-shadow: 0 10px 30px rgba(16,24,40,0.06); overflow: hidden; margin-bottom: 0.9rem; }
    .pp-hero { padding: 1.5rem 1.25rem 1.25rem; text-align: center; background: linear-gradient(180deg, #fff8e1 0%, #ffffff 100%); }
    .pp-photo { width: 112px; height: 112px; border-radius: 50%; object-fit: cover; border: 4px solid #fff; box-shadow: 0 8px 24px rgba(16,24,40,0.12); background: #fff; }
    .pp-name { font-size: 1.6rem; font-weight: 800; color: #1f2328; margin: 0.75rem 0 0.1rem; letter-spacing: -0.01em; }
    .pp-meta { color: #6b7280; font-size: 0.92rem; text-transform: capitalize; }
    .pp-reg { display: inline-flex; align-items: center; gap: 0.4rem; margin-top: 0.6rem; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.82rem; font-weight: 600; color: #1f2328; background: #f3f4f6; padding: 0.25rem 0.7rem; border-radius: 999px; }
    .pp-chips { display: flex; justify-content: center; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.75rem; }
    .pp-chip { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.74rem; font-weight: 700; padding: 0.22rem 0.65rem; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 12%, #fff); }
    .pp-chip i { font-size: 0.68rem; }

    .pp-section { padding: 1.1rem 1.25rem; border-top: 1px solid #f0f1f3; }
    .pp-section-title { display: flex; align-items: center; gap: 0.5rem; font-size: 0.74rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; margin-bottom: 0.85rem; }
    .pp-section-title i { color: #e0a800; }
    .pp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem 1rem; }
    .pp-grid dt { font-size: 0.72rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.1rem; }
    .pp-grid dd { margin: 0; font-size: 0.95rem; font-weight: 600; color: #1f2328; text-transform: capitalize; }

    .pp-rec { display: flex; align-items: center; gap: 0.75rem; padding: 0.7rem 0; border-bottom: 1px solid #f3f4f6; }
    .pp-rec:last-child { border-bottom: none; padding-bottom: 0; }
    .pp-rec:first-child { padding-top: 0; }
    .pp-rec-ic { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.85rem; color: var(--c); background: color-mix(in srgb, var(--c) 13%, #fff); }
    .pp-rec-name { font-weight: 700; font-size: 0.92rem; color: #1f2328; }
    .pp-rec-sub { font-size: 0.78rem; color: #6b7280; }
    .pp-due { margin-left: auto; font-size: 0.7rem; font-weight: 700; padding: 0.18rem 0.55rem; border-radius: 999px; white-space: nowrap; }
    .pp-due.ok { background: rgba(25,135,84,0.1); color: #198754; }
    .pp-due.soon { background: rgba(255,193,7,0.2); color: #8a6500; }
    .pp-due.over { background: rgba(220,53,69,0.1); color: #dc3545; }
    .pp-none { font-size: 0.88rem; color: #9ca3af; }

    .pp-contact { background: #fffdf5; color: #1f2328; border: 1px solid #ffe08a; border-radius: 18px; padding: 1.15rem 1.25rem; margin-bottom: 0.9rem; box-shadow: 0 10px 30px rgba(16,24,40,0.06); }
    .pp-contact h3 { font-size: 1rem; font-weight: 700; margin: 0 0 0.2rem; color: #1f2328; }
    .pp-contact p { font-size: 0.84rem; color: #6b7280; margin: 0 0 0.9rem; }
    .pp-call { display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; height: 46px; border-radius: 12px; background: #ffc107; color: #1f2328; font-weight: 700; font-size: 0.95rem; text-decoration: none; transition: background 0.15s ease, transform 0.15s ease; }
    .pp-call:hover { background: #f0b400; color: #1f2328; transform: translateY(-1px); }
    .pp-owner { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.85rem; }
    .pp-owner-ic { width: 38px; height: 38px; border-radius: 50%; background: rgba(255,193,7,0.18); color: #b88a00; display: flex; align-items: center; justify-content: center; }
    .pp-owner strong { display: block; font-size: 0.95rem; color: #1f2328; }
    .pp-owner span { font-size: 0.8rem; color: #6b7280; }

    .pp-foot { text-align: center; font-size: 0.78rem; color: #9ca3af; line-height: 1.6; }
    .pp-foot a { color: #b88a00; font-weight: 600; text-decoration: none; }
    .pp-foot a:hover { text-decoration: underline; }

    .pp-skel { background: linear-gradient(90deg, #f0f1f3 25%, #e6e8eb 50%, #f0f1f3 75%); background-size: 800px 100%; animation: ppShimmer 1.4s ease-in-out infinite; border-radius: 10px; }
    .pp-empty { text-align: center; padding: 2.5rem 1.5rem; }
    .pp-empty .ic { width: 60px; height: 60px; border-radius: 16px; margin: 0 auto 1rem; background: rgba(220,53,69,0.1); color: #dc3545; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
    .pp-empty h2 { font-size: 1.15rem; font-weight: 700; color: #1f2328; margin-bottom: 0.35rem; }
    .pp-empty p { color: #6b7280; font-size: 0.9rem; margin: 0; }
    @media (prefers-reduced-motion: reduce) { .pp-anim, .pp-skel { animation: none !important; } }
  `;

  const Brand = (
    <div className="pp-brand pp-anim">
      <Link to="/" className="pp-brand-left">
        <img src="/logo.png" alt="" onError={e => { e.target.style.display = 'none'; }} />
        <span className="pp-wordmark"><span>Pet</span>Unity</span>
      </Link>
      <span className="pp-tag"><i className="fas fa-id-badge me-1" />Pet ID</span>
    </div>
  );

  if (loading) {
    return (
      <div className="pp-page">
        <style>{styles}</style>
        <div className="pp-wrap">
          {Brand}
          <div className="pp-card" style={{ padding: '1.5rem 1.25rem' }}>
            <div className="pp-skel" style={{ width: 112, height: 112, borderRadius: '50%', margin: '0 auto 1rem' }} />
            <div className="pp-skel" style={{ width: '50%', height: 22, margin: '0 auto 0.6rem' }} />
            <div className="pp-skel" style={{ width: '35%', height: 14, margin: '0 auto 1.5rem' }} />
            {[0, 1, 2].map(i => <div key={i} className="pp-skel" style={{ height: 40, marginBottom: '0.6rem' }} />)}
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !pet) {
    return (
      <div className="pp-page">
        <style>{styles}</style>
        <div className="pp-wrap">
          {Brand}
          <div className="pp-card pp-empty pp-anim">
            <div className="ic"><i className="fas fa-search" /></div>
            <h2>Pet not found</h2>
            <p>This QR code is not linked to an active pet in PetUnity. It may have been removed by its owner.</p>
          </div>
          <div className="pp-foot">Registered pets of Muntinlupa City · <Link to="/">Visit PetUnity</Link></div>
        </div>
      </div>
    );
  }

  const age = ageOf(pet.birth_date);
  const vaccinations = pet.vaccinations || [];
  const rabies = vaccinations.find(v => /rabies/i.test(v.name || ''));
  const rabiesStatus = rabies ? dueStatus(rabies.next_due_date) : null;

  return (
    <div className="pp-page">
      <style>{styles}</style>
      <div className="pp-wrap">
        {Brand}

        <div className="pp-card pp-anim" style={{ '--d': '0.05s' }}>
          <div className="pp-hero">
            <img className="pp-photo" src={photoOf(pet)} alt={pet.name} onError={e => { e.target.src = '/pet-default.png'; }} />
            <h1 className="pp-name">{pet.name}</h1>
            <div className="pp-meta">{[pet.species, pet.breed].filter(Boolean).join(' · ')}</div>
            {pet.registration_number && (
              <div className="pp-reg"><i className="fas fa-id-card" style={{ color: '#9ca3af' }} />{pet.registration_number}</div>
            )}
            <div className="pp-chips">
              {rabies
                ? <span className="pp-chip" style={{ '--c': rabiesStatus?.tone === 'over' ? '#dc3545' : '#198754' }}>
                    <i className="fas fa-shield-alt" />{rabiesStatus?.tone === 'over' ? 'Anti-rabies overdue' : 'Anti-rabies vaccinated'}
                  </span>
                : <span className="pp-chip" style={{ '--c': '#6b7280' }}><i className="fas fa-shield-alt" />No anti-rabies record</span>}
              {Number(pet.sterilized) === 1 && (
                <span className="pp-chip" style={{ '--c': '#6f42c1' }}><i className="fas fa-check" />{pet.gender === 'male' ? 'Neutered' : 'Spayed'}</span>
              )}
            </div>
          </div>

          <div className="pp-section">
            <div className="pp-section-title"><i className="fas fa-paw" />Pet details</div>
            <dl className="pp-grid" style={{ margin: 0 }}>
              <div><dt>Gender</dt><dd>{pet.gender || '—'}</dd></div>
              <div><dt>Age</dt><dd style={{ textTransform: 'none' }}>{age || '—'}</dd></div>
              <div><dt>Color</dt><dd>{pet.color || '—'}</dd></div>
              <div><dt>Weight</dt><dd style={{ textTransform: 'none' }}>{pet.weight ? `${pet.weight} kg` : '—'}</dd></div>
            </dl>
          </div>

          <div className="pp-section">
            <div className="pp-section-title"><i className="fas fa-syringe" />Vaccinations</div>
            {vaccinations.length === 0 ? (
              <div className="pp-none">No vaccination records yet.</div>
            ) : vaccinations.map((v, i) => {
              const st = dueStatus(v.next_due_date);
              return (
                <div key={i} className="pp-rec">
                  <div className="pp-rec-ic" style={{ '--c': '#e0a800' }}><i className="fas fa-syringe" /></div>
                  <div style={{ minWidth: 0 }}>
                    <div className="pp-rec-name">{v.name}</div>
                    <div className="pp-rec-sub">Given {fmtDate(v.vaccination_date)}{v.next_due_date ? ` · Next ${fmtDate(v.next_due_date)}` : ''}</div>
                  </div>
                  {st && <span className={`pp-due ${st.tone}`}>{st.label}</span>}
                </div>
              );
            })}
          </div>

          {pet.last_deworming && (
            <div className="pp-section">
              <div className="pp-section-title"><i className="fas fa-tablets" />Last deworming</div>
              <div className="pp-rec">
                <div className="pp-rec-ic" style={{ '--c': '#20c997' }}><i className="fas fa-tablets" /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="pp-rec-name">{pet.last_deworming.name}</div>
                  <div className="pp-rec-sub">Given {fmtDate(pet.last_deworming.deworming_date)}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {pet.owner_phone && (
          <div className="pp-contact pp-anim" style={{ '--d': '0.12s' }}>
            <h3>Found this pet?</h3>
            <p>Please contact the owner so {pet.name} can get home safely.</p>
            <div className="pp-owner">
              <div className="pp-owner-ic"><i className="fas fa-user" /></div>
              <div>
                <strong>{pet.owner_first_name || 'Owner'}</strong>
                <span>Pet owner</span>
              </div>
            </div>
            <a className="pp-call" href={`tel:${pet.owner_phone}`}>
              <i className="fas fa-phone" />Call {pet.owner_phone}
            </a>
          </div>
        )}

        <div className="pp-foot pp-anim" style={{ '--d': '0.18s' }}>
          Registered with PetUnity · City Veterinary Office of Muntinlupa<br />
          Are you the owner? <Link to="/login">Log in</Link> to manage this pet.
        </div>
      </div>
    </div>
  );
};

export default PublicPetProfile;