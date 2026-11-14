import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Spinner } from 'react-bootstrap';
import { petAPI, vetCardAPI, handleAPIError } from '../../services/api';

const parseDate = (value) => {
  if (!value || value === '0000-00-00') return null;
  if (value instanceof Date) return isNaN(value) ? null : value;
  const d = new Date(String(value).replace(' ', 'T'));
  return isNaN(d) ? null : d;
};

const fmtDate = (value, fallback = '—') => {
  const d = parseDate(value);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : fallback;
};

const startOfToday = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };

const dueInfo = (value) => {
  const d = parseDate(value);
  if (!d) return null;
  const days = Math.round((d - startOfToday()) / 86400000);
  if (days < 0) return { tone: 'over', label: 'Overdue', days };
  if (days <= 30) return { tone: 'soon', label: days === 0 ? 'Due today' : `In ${days} day${days === 1 ? '' : 's'}`, days };
  return { tone: 'ok', label: 'Scheduled', days };
};

const calcAge = (birth) => {
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

const latest = (list, key) => list.reduce((best, r) => {
  const d = parseDate(r[key]);
  return d && (!best || d > best) ? d : best;
}, null);

const VetCardView = () => {
  const { petId } = useParams();
  const [pet, setPet] = useState(null);
  const [vaccinations, setVaccinations] = useState([]);
  const [dewormings, setDewormings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (petId) {
      loadPetData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  const loadPetData = async () => {
    try {
      setLoading(true);
      setError('');
      const [petRes, vetCardRes] = await Promise.all([
        petAPI.getById(petId),
        vetCardAPI.getByPetId(petId)
      ]);

      setPet(petRes.data.pet);
      setVaccinations(vetCardRes.data.vet_card?.vaccination_records || []);
      setDewormings(vetCardRes.data.vet_card?.deworming_records || []);
    } catch (err) {
      const { message } = handleAPIError(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Newest first
  const sortedVacc = [...vaccinations].sort((a, b) => (parseDate(b.vaccination_date) || 0) - (parseDate(a.vaccination_date) || 0));
  const sortedDeworm = [...dewormings].sort((a, b) => (parseDate(b.deworming_date) || 0) - (parseDate(a.deworming_date) || 0));

  const lastVacc = latest(vaccinations, 'vaccination_date');
  const lastDeworm = latest(dewormings, 'deworming_date');

  const styles = `
    .vc-page { min-height: 100vh; background: #ffffff; padding: 2rem 1rem 3rem; }
    .vc-wrap { max-width: 1040px; margin: 0 auto; zoom: 0.75; }
    @media (min-width: 1600px) { .vc-wrap { zoom: 0.9; } }
    @media (min-width: 1920px) { .vc-wrap { zoom: 1; } }
    @media (max-width: 768px) { .vc-wrap { zoom: 1; } }
    @keyframes vcIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }

    .vc-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.25rem; animation: vcIn 0.4s ease-out; }
    .vc-toolbar h1 { font-size: 1.6rem; font-weight: 700; color: #1f2328; margin: 0; }
    .vc-toolbar p { color: #6b7280; font-size: 0.92rem; margin: 0.15rem 0 0; }
    .vc-btn { display: inline-flex; align-items: center; gap: 0.5rem; height: 42px; padding: 0 1.15rem; border-radius: 10px; border: 1px solid transparent; font-weight: 600; font-size: 0.9rem; transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease; }
    .vc-btn.primary { background: #ffc107; color: #1f2328; }
    .vc-btn.primary:hover { background: #f0b400; box-shadow: 0 6px 16px rgba(255,193,7,0.35); transform: translateY(-1px); }
    .vc-btn:focus-visible { outline: 2px solid #e0a800; outline-offset: 2px; }

    .vc-card { background: #fff; border: 1px solid #e9ecef; border-radius: 16px; box-shadow: none; overflow: hidden; animation: vcIn 0.45s ease-out 0.05s backwards; }

    .vc-head { display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap; padding: 1.75rem 2.25rem; background: #ffffff; color: #1f2328; border-bottom: 1px solid #e9ecef; }
    .vc-brand { display: flex; align-items: center; gap: 0.9rem; }
    .vc-logo { width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .vc-logo img { width: 100%; height: 100%; object-fit: contain; }
    .vc-head-title { font-size: 1.35rem; font-weight: 800; letter-spacing: 0.02em; margin: 0; }
    .vc-head-sub { font-size: 0.85rem; color: #6b7280; margin-top: 0.15rem; }
    .vc-regno { text-align: right; }
    .vc-regno small { display: block; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em; color: #9ca3af; text-transform: uppercase; }
    .vc-regno strong { display: block; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 1.3rem; letter-spacing: 0.06em; color: #1f2328; margin-top: 0.15rem; }

    .vc-body { padding: 2rem 2.25rem 2.25rem; }

    .vc-profile { display: grid; grid-template-columns: 1.15fr 1fr; gap: 1.25rem; margin-bottom: 2rem; }
    .vc-box { border: 1px solid #eef0f3; border-radius: 12px; padding: 1.25rem 1.35rem; }
    .vc-box-title { display: flex; align-items: center; gap: 0.5rem; font-size: 0.74rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #6b7280; margin-bottom: 1rem; }
    .vc-box-title i { color: #b88a00; }
    .vc-pet-id { display: flex; align-items: center; gap: 0.9rem; margin-bottom: 1.1rem; }
    .vc-pet-avatar { width: 54px; height: 54px; border-radius: 50%; background: rgba(255,193,7,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
    .vc-pet-avatar img { width: 36px; height: 36px; object-fit: contain; }
    .vc-pet-name { font-size: 1.35rem; font-weight: 800; color: #1f2328; line-height: 1.2; }
    .vc-pet-meta { font-size: 0.86rem; color: #6b7280; text-transform: capitalize; }
    .vc-dl { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem 1.25rem; margin: 0; }
    .vc-dl.one { grid-template-columns: 1fr; }
    .vc-dl dt { font-size: 0.72rem; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.15rem; }
    .vc-dl dd { font-size: 0.93rem; font-weight: 600; color: #1f2328; margin: 0; word-break: break-word; }
    .vc-dl dd.cap { text-transform: capitalize; }
    .vc-dl dd.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-weight: 500; }
    .vc-dl dd .muted { color: #9ca3af; font-weight: 500; }
    .vc-status { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.65rem; border-radius: 999px; }
    .vc-status.on { background: rgba(25,135,84,0.12); color: #198754; }
    .vc-status.off { background: rgba(108,117,125,0.14); color: #6c757d; }
    .vc-status i { font-size: 0.42rem; }


    .vc-section { margin-bottom: 2rem; }
    .vc-section-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: 0.85rem; }
    .vc-section-title { display: flex; align-items: center; gap: 0.6rem; font-size: 1.05rem; font-weight: 700; color: #1f2328; margin: 0; }
    .vc-section-ic { width: 32px; height: 32px; border-radius: 9px; background: color-mix(in srgb, var(--c) 13%, #fff); color: var(--c); display: flex; align-items: center; justify-content: center; font-size: 0.82rem; }
    .vc-count { font-size: 0.72rem; font-weight: 700; padding: 0.1rem 0.55rem; border-radius: 999px; background: #1f2328; color: #fff; }
    .vc-section-meta { font-size: 0.82rem; color: #6b7280; }

    .vc-table-wrap { border: 1px solid #eef0f3; border-radius: 12px; overflow: hidden; }
    .vc-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .vc-table th { background: #f8f9fa; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; padding: 0.75rem 0.85rem; text-align: left; border-bottom: 1px solid #eef0f3; }
    .vc-table td { padding: 0.8rem 0.85rem; border-bottom: 1px solid #f3f4f6; font-size: 0.88rem; color: #1f2328; vertical-align: top; word-break: break-word; }
    .vc-table tbody tr:last-child td { border-bottom: none; }
    .vc-table tbody tr:nth-child(even) td { background: #fcfcfd; }
    .vc-strong { font-weight: 600; }
    .vc-muted { font-size: 0.8rem; color: #6b7280; }
    .vc-due { display: inline-flex; flex-direction: column; gap: 0.15rem; }
    .vc-due-pill { display: inline-flex; align-items: center; gap: 0.3rem; width: fit-content; font-size: 0.7rem; font-weight: 700; padding: 0.12rem 0.5rem; border-radius: 999px; }
    .vc-due-pill.over { background: rgba(220,53,69,0.1); color: #dc3545; }
    .vc-due-pill.soon { background: rgba(255,193,7,0.18); color: #8a6500; }
    .vc-due-pill.ok { background: rgba(25,135,84,0.1); color: #198754; }
    .vc-due-pill i { font-size: 0.62rem; }

    .vc-empty { border: 1px dashed #dfe2e6; border-radius: 12px; padding: 2rem 1rem; text-align: center; color: #6b7280; font-size: 0.9rem; }
    .vc-empty i { display: block; font-size: 1.5rem; color: #c4c9d0; margin-bottom: 0.6rem; }

    .vc-foot { padding-top: 1.5rem; border-top: 1px solid #eef0f3; background: #ffffff; color: #6b7280; }
    .vc-foot-note { font-size: 0.8rem; color: #6b7280; line-height: 1.6; }
    .vc-foot-note strong { color: #1f2328; }

    .vc-state { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #ffffff; padding: 2rem; }
    .vc-state-box { text-align: center; max-width: 420px; }
    .vc-state-ic { width: 60px; height: 60px; border-radius: 16px; margin: 0 auto 1rem; background: rgba(220,53,69,0.1); color: #dc3545; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
    .vc-state h2 { font-size: 1.15rem; font-weight: 700; color: #1f2328; margin-bottom: 0.35rem; }
    .vc-state p { color: #6b7280; font-size: 0.9rem; margin-bottom: 1rem; }

    @media (max-width: 768px) {
      .vc-page { padding: 1rem 0.75rem 2rem; }
      .vc-head { padding: 1.25rem; }
      .vc-regno { text-align: left; }
      .vc-body { padding: 1.25rem; }
      .vc-profile { grid-template-columns: 1fr; }
      .vc-table-wrap { overflow-x: auto; }
      .vc-table { table-layout: auto; min-width: 640px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .vc-toolbar, .vc-card { animation: none !important; }
    }

    @media print {
      @page { size: A4; margin: 12mm; }
      body { background: #fff !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print, nav, .navbar, .sidebar, .bottom-nav { display: none !important; }
      .vc-page { background: #fff; padding: 0; min-height: 0; }
      .vc-wrap { zoom: 1; max-width: none; }
      .vc-card { box-shadow: none; border: 1px solid #cfd4da; border-radius: 0; animation: none; }
      .vc-head { padding: 14px 18px; }
      .vc-body { padding: 16px 18px; }
      .vc-profile { grid-template-columns: 1.15fr 1fr; gap: 10px; margin-bottom: 12px; }
      .vc-box { padding: 10px 12px; }
      .vc-section { margin-bottom: 14px; }
      .vc-table { table-layout: auto; min-width: 0; }
      .vc-table th, .vc-table td { padding: 6px 8px; font-size: 10.5px; }
      .vc-table tr, .vc-box, .vc-foot { page-break-inside: avoid; break-inside: avoid; }
      .vc-section-head { page-break-after: avoid; break-after: avoid; }
    }
  `;

  if (loading) {
    return (
      <div className="vc-state">
        <style>{styles}</style>
        <div className="vc-state-box">
          <Spinner animation="border" style={{ color: '#e0a800' }} />
          <p style={{ marginTop: '1rem' }}>Loading veterinary card…</p>
        </div>
      </div>
    );
  }

  if (error || !pet) {
    return (
      <div className="vc-state">
        <style>{styles}</style>
        <div className="vc-state-box">
          <div className="vc-state-ic"><i className="fas fa-exclamation-triangle" /></div>
          <h2>Couldn't load this vet card</h2>
          <p>{error || 'The pet could not be found.'}</p>
          <button type="button" className="vc-btn primary" onClick={loadPetData}>
            <i className="fas fa-redo" />Try again
          </button>
        </div>
      </div>
    );
  }

  const species = (pet.species || '').toLowerCase();
  const faceImg = species === 'cat' ? '/cat_face.png' : species === 'rabbit' ? '/rabbit_face.png' : '/dog_face.png';
  const age = calcAge(pet.birth_date);
  const isActive = pet.is_active === undefined || pet.is_active === null ? true : !!Number(pet.is_active);
  const ownerName = `${pet.owner_first_name || ''} ${pet.owner_last_name || ''}`.trim();

  const DueCell = ({ value }) => {
    const info = dueInfo(value);
    if (!info) return <span className="vc-muted">—</span>;
    return (
      <span className="vc-due">
        <span className="vc-strong">{fmtDate(value)}</span>
        <span className={`vc-due-pill ${info.tone}`}>
          <i className={`fas ${info.tone === 'over' ? 'fa-exclamation-circle' : info.tone === 'soon' ? 'fa-clock' : 'fa-check-circle'}`} />{info.label}
        </span>
      </span>
    );
  };

  return (
    <div className="vc-page">
      <style>{styles}</style>
      <div className="vc-wrap">

        {/* Toolbar */}
        <div className="vc-toolbar no-print">
          <div>
            <h1>{pet.name}'s vet card</h1>
            <p>Vaccination and deworming history for this pet.</p>
          </div>
          <button type="button" className="vc-btn primary" onClick={handlePrint}>
            <i className="fas fa-print" />Print / Save as PDF
          </button>
        </div>

        <article className="vc-card vet-card-main">

          {/* Card header */}
          <div className="vc-head">
            <div className="vc-brand">
              <div className="vc-logo">
                <img src="/logo.png" alt="PetUnity logo" onError={e => { e.target.style.display = 'none'; }} />
              </div>
              <div>
                <h2 className="vc-head-title">PET VETERINARY HEALTH CARD</h2>
                <div className="vc-head-sub">PetUnity · Vaccination and health record</div>
              </div>
            </div>
            <div className="vc-regno">
              <small>Registration no.</small>
              <strong>{pet.registration_number || '—'}</strong>
            </div>
          </div>

          <div className="vc-body">

            {/* Pet + owner */}
            <div className="vc-profile">
              <section className="vc-box">
                <div className="vc-box-title"><i className="fas fa-paw" />Pet information</div>
                <div className="vc-pet-id">
                  <div className="vc-pet-avatar">
                    <img src={faceImg} alt="" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
                    <i className="fas fa-paw" style={{ display: 'none', color: '#e0a800', fontSize: '1.3rem' }} />
                  </div>
                  <div>
                    <div className="vc-pet-name">{pet.name}</div>
                    <div className="vc-pet-meta">{[pet.species, pet.breed].filter(Boolean).join(' · ') || '—'}</div>
                  </div>
                </div>
                <dl className="vc-dl">
                  <div><dt>Gender</dt><dd className="cap">{pet.gender || <span className="muted">—</span>}</dd></div>
                  <div><dt>Birth date</dt><dd>{fmtDate(pet.birth_date, 'Not specified')}{age && <span className="muted"> · {age}</span>}</dd></div>
                  <div><dt>Weight</dt><dd>{pet.weight ? `${pet.weight} kg` : <span className="muted">Not recorded</span>}</dd></div>
                  <div><dt>Microchip no.</dt><dd className="mono">{pet.microchip_number || <span className="muted">Not microchipped</span>}</dd></div>
                </dl>
              </section>

              <section className="vc-box">
                <div className="vc-box-title"><i className="fas fa-user" />Owner information</div>
                <dl className="vc-dl one">
                  <div><dt>Owner name</dt><dd>{ownerName || <span className="muted">—</span>}</dd></div>
                  <div><dt>Contact number</dt><dd>{pet.owner_phone || <span className="muted">Not provided</span>}</dd></div>
                  <div><dt>Email address</dt><dd>{pet.owner_email || <span className="muted">Not provided</span>}</dd></div>
                  <div>
                    <dt>Card status</dt>
                    <dd>
                      <span className={`vc-status ${isActive ? 'on' : 'off'}`}>
                        <i className="fas fa-circle" />{isActive ? 'Active' : 'Inactive'}
                      </span>
                    </dd>
                  </div>
                </dl>
              </section>
            </div>

            {/* Vaccinations */}
            <section className="vc-section">
              <div className="vc-section-head">
                <h3 className="vc-section-title">
                  <span className="vc-section-ic" style={{ '--c': '#b88a00' }}><i className="fas fa-syringe" /></span>
                  Vaccination history
                  <span className="vc-count">{vaccinations.length}</span>
                </h3>
                {lastVacc && <span className="vc-section-meta">Last given {fmtDate(lastVacc)}</span>}
              </div>
              {sortedVacc.length === 0 ? (
                <div className="vc-empty">
                  <i className="fas fa-syringe" />
                  No vaccination records yet. Visit your barangay office or a partner clinic for vaccination.
                </div>
              ) : (
                <div className="vc-table-wrap">
                  <table className="vc-table vaccination-table">
                    <thead>
                      <tr>
                        <th style={{ width: '14%' }}>Date</th>
                        <th style={{ width: '26%' }}>Vaccine</th>
                        <th style={{ width: '10%' }}>Weight</th>
                        <th style={{ width: '18%' }}>Next due</th>
                        <th style={{ width: '16%' }}>Veterinarian</th>
                        <th style={{ width: '16%' }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedVacc.map((v, i) => (
                        <tr key={v.id ?? i}>
                          <td className="vc-strong">{fmtDate(v.vaccination_date)}</td>
                          <td>
                            <div className="vc-strong">{v.vaccine_name || '—'}</div>
                            {v.vaccine_description && <div className="vc-muted">{v.vaccine_description}</div>}
                          </td>
                          <td>{v.weight ? `${v.weight} kg` : <span className="vc-muted">—</span>}</td>
                          <td><DueCell value={v.next_due_date} /></td>
                          <td>{v.veterinarian_name || <span className="vc-muted">Not specified</span>}</td>
                          <td className="vc-muted">{v.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* Dewormings (only shown when the pet has records) */}
            {sortedDeworm.length > 0 && (
            <section className="vc-section">
              <div className="vc-section-head">
                <h3 className="vc-section-title">
                  <span className="vc-section-ic" style={{ '--c': '#20c997' }}><i className="fas fa-tablets" /></span>
                  Deworming history
                  <span className="vc-count">{dewormings.length}</span>
                </h3>
                {lastDeworm && <span className="vc-section-meta">Last given {fmtDate(lastDeworm)}</span>}
              </div>
                <div className="vc-table-wrap">
                  <table className="vc-table deworming-table">
                    <thead>
                      <tr>
                        <th style={{ width: '13%' }}>Date</th>
                        <th style={{ width: '22%' }}>Dewormer</th>
                        <th style={{ width: '9%' }}>Weight</th>
                        <th style={{ width: '11%' }}>Dosage</th>
                        <th style={{ width: '17%' }}>Next due</th>
                        <th style={{ width: '14%' }}>Veterinarian</th>
                        <th style={{ width: '14%' }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDeworm.map((d, i) => (
                        <tr key={d.id ?? i}>
                          <td className="vc-strong">{fmtDate(d.deworming_date)}</td>
                          <td>
                            <div className="vc-strong">{d.deworming_type_name || '—'}</div>
                            {d.deworming_type_description && <div className="vc-muted">{d.deworming_type_description}</div>}
                          </td>
                          <td>{d.weight ? `${d.weight} kg` : <span className="vc-muted">—</span>}</td>
                          <td>{d.dosage || <span className="vc-muted">—</span>}</td>
                          <td><DueCell value={d.next_due_date} /></td>
                          <td>{d.veterinarian_name || <span className="vc-muted">Not specified</span>}</td>
                          <td className="vc-muted">{d.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </section>
            )}

            {/* Footer */}
            <div className="vc-foot">
              <div className="vc-foot-note">
                <strong>PetUnity</strong> · Keep this card for your pet's records and bring it to every vaccination or check-up.
                For questions, contact your local barangay office.
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default VetCardView;