// components/common/RabiesForecast.jsx
// Shared by the admin and community Map Status pages:
//   • useRabiesForecast() – loads the forecast from GET /reports/forecast
//   • createHeatLayer()   – draws the rabies risk heatmap on a Google map
//   • HeatLegend          – the colour legend shown on the map
//   • ForecastList        – barangays ranked by forecast risk
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

/* ------------------------------------------------------------------ */
/* Data                                                               */
/* ------------------------------------------------------------------ */
export const useRabiesForecast = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    try {
      const res = await api.get('/reports/forecast');
      setData(res.data);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load the rabies forecast.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload };
};

/* ------------------------------------------------------------------ */
/* Heat layer                                                         */
/* ------------------------------------------------------------------ */
// Google removed its built-in heatmap (May 2026), so the heat is drawn here on a
// canvas on top of the map. It uses no extra map credits.
export const HEAT_RADIUS_M = 550;   // how far each case "spreads", in metres

// Colour scale: transparent green → yellow → orange → red
const HEAT_PALETTE = (() => {
  const stops = [[0, [34, 197, 94]], [0.35, [234, 179, 8]], [0.65, [249, 115, 22]], [1, [220, 38, 38]]];
  const out = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let k = 0;
    while (k < stops.length - 2 && t > stops[k + 1][0]) k++;
    const [t0, c0] = stops[k], [t1, c1] = stops[k + 1];
    const f = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    for (let j = 0; j < 3; j++) out[i * 3 + j] = c0[j] + (c1[j] - c0[j]) * f;
  }
  return out;
})();

// Call after Google Maps has loaded: const heat = createHeatLayer(window.google.maps); heat.setMap(map);
// Then heat.setPoints([{ lat, lng, weight }]) and call heat.draw() on the map's 'idle' event.
export const createHeatLayer = (gm) => {
  class HeatLayer extends gm.OverlayView {
    constructor() {
      super();
      this.points = [];
      this.canvas = document.createElement('canvas');
      Object.assign(this.canvas.style, { position: 'absolute', pointerEvents: 'none' });
    }
    onAdd() { this.getPanes().overlayLayer.appendChild(this.canvas); }
    onRemove() { this.canvas.remove(); }
    setPoints(points) { this.points = points || []; this.draw(); }
    draw() {
      const proj = this.getProjection();
      const map = this.getMap();
      const bounds = map && map.getBounds();
      if (!proj || !bounds) return;

      const pad = 150;
      const sw = proj.fromLatLngToDivPixel(bounds.getSouthWest());
      const ne = proj.fromLatLngToDivPixel(bounds.getNorthEast());
      const left = Math.floor(Math.min(sw.x, ne.x)) - pad;
      const top = Math.floor(Math.min(sw.y, ne.y)) - pad;
      const w = Math.ceil(Math.abs(ne.x - sw.x)) + pad * 2;
      const h = Math.ceil(Math.abs(sw.y - ne.y)) + pad * 2;
      const c = this.canvas;
      Object.assign(c.style, { left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` });
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.clearRect(0, 0, w, h);
      if (!this.points.length) return;

      // Metres → pixels at the current zoom
      const lat = map.getCenter().lat();
      const mPerPx = (156543.03392 * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, map.getZoom());
      const r = Math.max(14, Math.min(160, HEAT_RADIUS_M / mPerPx));

      // 1) Each case is a soft dark spot; overlapping spots add up
      this.points.forEach((p) => {
        const px = proj.fromLatLngToDivPixel(new gm.LatLng(p.lat, p.lng));
        const x = px.x - left, y = px.y - top;
        if (x < -r || y < -r || x > w + r || y > h + r) return;
        const a = Math.min(1, Math.max(0.18, p.weight)) * 0.7;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(0,0,0,${a})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      });

      // 2) Turn the darkness into heat colours
      const img = ctx.getImageData(0, 0, w, h);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        const v = d[i + 3];
        if (!v) continue;
        d[i] = HEAT_PALETTE[v * 3];
        d[i + 1] = HEAT_PALETTE[v * 3 + 1];
        d[i + 2] = HEAT_PALETTE[v * 3 + 2];
        d[i + 3] = Math.min(215, v * 1.8);
      }
      ctx.putImageData(img, 0, 0);
    }
  }
  return new HeatLayer();
};

/* ------------------------------------------------------------------ */
/* UI pieces                                                          */
/* ------------------------------------------------------------------ */
export const RISK_LEVELS = {
  high:     { label: 'High',     color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  moderate: { label: 'Moderate', color: '#ea580c', bg: 'rgba(234,88,12,0.1)' },
  low:      { label: 'Low',      color: '#ca8a04', bg: 'rgba(202,138,4,0.12)' },
  none:     { label: 'No cases', color: '#16a34a', bg: 'rgba(22,163,74,0.1)' },
};
const TRENDS = {
  rising:  { icon: 'fa-arrow-up',   label: 'Rising',  color: '#dc2626' },
  stable:  { icon: 'fa-minus',      label: 'Stable',  color: '#6b7280' },
  falling: { icon: 'fa-arrow-down', label: 'Falling', color: '#16a34a' },
};

const fmtShort = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—');

const STYLES = `
  .rf-legend { position: absolute; left: 12px; bottom: 24px; z-index: 10; min-width: 200px; padding: 0.7rem 0.85rem; border-radius: 12px;
    background: rgba(13,20,36,0.82); backdrop-filter: blur(8px); box-shadow: 0 6px 20px rgba(0,0,0,0.25); color: #fff; }
  .rf-legend-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #cfd6e4; margin-bottom: 0.45rem; }
  .rf-legend-bar { height: 10px; border-radius: 999px; background: linear-gradient(90deg, rgba(34,197,94,0.55), #eab308, #f97316, #dc2626); }
  .rf-legend-scale { display: flex; justify-content: space-between; font-size: 0.72rem; color: #cfd6e4; margin-top: 0.3rem; }
  .rf-legend-note { font-size: 0.7rem; color: #a9b4cc; margin-top: 0.45rem; line-height: 1.4; }

  .rf-list { display: flex; flex-direction: column; }
  .rf-row { display: flex; align-items: flex-start; gap: 0.65rem; width: 100%; padding: 0.6rem 0.5rem; border: none; border-radius: 10px;
    background: transparent; text-align: left; cursor: pointer; transition: background 0.15s ease; }
  .rf-row:hover { background: #f6f7f9; }
  .rf-row.on { background: #fff8e1; box-shadow: inset 3px 0 0 #ffc107; }
  .rf-row:focus-visible { outline: 2px solid #ffc107; outline-offset: 2px; }
  .rf-rank { width: 24px; height: 24px; border-radius: 7px; background: #f1f3f5; color: #4b5563; font-size: 0.74rem; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .rf-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
  .rf-top { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .rf-name { font-weight: 600; color: #1f2328; font-size: 0.86rem; }
  .rf-chip { font-size: 0.68rem; font-weight: 700; padding: 0.12rem 0.5rem; border-radius: 999px; white-space: nowrap; }
  .rf-meta { display: flex; flex-wrap: wrap; gap: 0.15rem 0.75rem; font-size: 0.74rem; color: #6b7280; }
  .rf-meta i { margin-right: 0.25rem; font-size: 0.66rem; }
  .rf-sum { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-bottom: 0.65rem; }
  .rf-sum > div { background: #f6f7f9; border-radius: 10px; padding: 0.55rem 0.7rem; }
  .rf-sum .k { font-size: 0.7rem; color: #6b7280; }
  .rf-sum .v { font-size: 1.15rem; font-weight: 700; color: #1f2328; font-variant-numeric: tabular-nums; }
  .rf-how { font-size: 0.74rem; color: #6b7280; line-height: 1.45; margin-top: 0.6rem; padding-top: 0.6rem; border-top: 1px solid #e9ecef; }
  .rf-skel { height: 40px; margin-bottom: 0.5rem; border-radius: 8px; background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 800px 100%; animation: rfShimmer 1.4s ease-in-out infinite; }
  @keyframes rfShimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
`;

export const ForecastStyles = () => <style>{STYLES}</style>;

export const HeatLegend = ({ empty }) => (
  <div className="rf-legend">
    <div className="rf-legend-title"><i className="fas fa-fire me-1" />Rabies risk · next 30 days</div>
    <div className="rf-legend-bar" />
    <div className="rf-legend-scale"><span>Lower</span><span>Higher</span></div>
    <div className="rf-legend-note">
      {empty ? 'No rabies-related reports in the past year.' : 'Based on rabies and bite reports from the past year. Recent and confirmed cases count more.'}
    </div>
  </div>
);

// Barangays ranked by risk. onSelect(barangay) lets the page zoom the map to it.
export const ForecastList = ({ forecast, selected, onSelect, limit }) => {
  const { data, loading, error } = forecast;
  if (loading) return [0, 1, 2, 3].map((i) => <div key={i} className="rf-skel" style={{ opacity: 1 - i * 0.15 }} />);
  if (error) return <div style={{ fontSize: '0.82rem', color: '#842029' }}>{error}</div>;

  const totals = data?.totals || {};
  const list = (data?.barangays || []).slice(0, limit || undefined);
  return (
    <>
      <div className="rf-sum">
        <div><div className="k">Expected cases</div><div className="v">{totals.expected_30d ?? 0}</div></div>
        <div><div className="k">High-risk barangays</div><div className="v">{totals.high_risk ?? 0}</div></div>
      </div>
      <div className="rf-list">
        {list.map((b, i) => {
          const lv = RISK_LEVELS[b.level] || RISK_LEVELS.none;
          const tr = TRENDS[b.trend] || TRENDS.stable;
          return (
            <button key={b.id} type="button" className={`rf-row${selected === b.id ? ' on' : ''}`} onClick={() => onSelect && onSelect(b)}>
              <span className="rf-rank">{i + 1}</span>
              <span className="rf-main">
                <span className="rf-top">
                  <span className="rf-name">{b.name}</span>
                  <span className="rf-chip" style={{ color: lv.color, background: lv.bg }}>{lv.label}</span>
                </span>
                <span className="rf-meta">
                  <span title="Forecast for the next 30 days"><i className="fas fa-chart-line" />~{b.expected_30d} expected</span>
                  <span style={{ color: tr.color }}><i className={`fas ${tr.icon}`} />{tr.label}</span>
                  <span title="Most recent report"><i className="fas fa-clock" />{fmtShort(b.last_case)}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="rf-how">
        Forecast for the next 30 days. Each report is weighted by how serious it is (positive &gt; suspected &gt; case report &gt; bite)
        and how recent it is, then the last 90 days are compared with the 90 days before to find the trend.
      </div>
    </>
  );
};

// Zooms the map to a barangay's reported cases (or its rough centre)
const BRGY_CENTER = {
  sucat: [14.4614, 121.0466], buli: [14.4447, 121.0503], cupang: [14.4316, 121.0475],
  alabang: [14.4150, 121.0330], bayanan: [14.4053, 121.0473], putatan: [14.3960, 121.0367],
  poblacion: [14.3826, 121.0450], tunasan: [14.3687, 121.0369],
};
const key = (name) => String(name || '').toLowerCase().replace(/[^a-z]/g, '');

export const focusBarangayOnMap = (map, barangay, points) => {
  const gm = window.google?.maps;
  if (!map || !gm || !barangay) return;
  const pts = (points || []).filter((p) => key(p.barangay) === key(barangay.name));
  if (pts.length > 1) {
    const bounds = new gm.LatLngBounds();
    pts.forEach((p) => bounds.extend({ lat: p.lat, lng: p.lng }));
    map.fitBounds(bounds, 80);
    gm.event.addListenerOnce(map, 'idle', () => { if (map.getZoom() > 16) map.setZoom(16); });
    return;
  }
  const c = pts[0] ? [pts[0].lat, pts[0].lng] : BRGY_CENTER[key(barangay.name)];
  if (!c) return;
  map.panTo({ lat: c[0], lng: c[1] });
  map.setZoom(15);
};