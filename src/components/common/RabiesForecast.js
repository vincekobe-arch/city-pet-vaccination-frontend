// components/common/RabiesForecast.jsx
// Shared by the admin and community Map Status pages:
//   • useRabiesForecast() – loads the forecast from GET /reports/forecast
//   • createHeatLayer()   – draws the rabies risk map (weather-radar style) on a Google map
//   • HeatLegend          – the colour legend shown on the map
//   • ForecastList        – barangays ranked by forecast risk (read-only)
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
/* Heat layer (weather-radar style)                                   */
/* ------------------------------------------------------------------ */
// Google removed its built-in heatmap (May 2026), so the risk map is drawn here on a
// canvas on top of the map. It uses no extra map credits.
//
// Like a weather radar: nearby cases blend into one area, the area is split into
// colour bands (green → yellow → orange → red → magenta), each band has an outline,
// and the edges are uneven instead of perfect circles.
export const HEAT_RADIUS_M = 600;   // how far each case's risk reaches, in metres

// Colour bands: [minimum risk value, fill colour, fill opacity]
export const RISK_BANDS = [
  [0.08, [134, 239, 172], 0.45],   // light green  – low
  [0.22, [34, 197, 94],   0.55],   // green
  [0.40, [250, 204, 21],  0.62],   // yellow       – moderate
  [0.60, [249, 115, 22],  0.68],   // orange
  [0.85, [220, 38, 38],   0.74],   // red          – high
  [1.20, [157, 23, 77],   0.80],   // magenta      – very high
];

// Smooth random-looking noise (same result every time for the same place)
const hash = (x, y) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
};
const smooth = (t) => t * t * (3 - 2 * t);
const valueNoise = (x, y) => {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = smooth(x - xi), yf = smooth(y - yi);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
};
// Two layers of noise in map coordinates (so shapes stay the same when panning/zooming)
const edgeNoise = (lat, lng) =>
  0.65 * valueNoise(lat * 260, lng * 260) + 0.35 * valueNoise(lat * 700 + 17.3, lng * 700 - 4.1);

// Draws the risk areas ONCE into an image tied to map coordinates (a Google GroundOverlay).
// Google then moves and scales that image itself while you pan and zoom, so the map stays
// smooth — nothing is recalculated on every zoom or scroll.
const METERS_PER_PX = 4;     // image detail: 1 image pixel = 4 m on the ground
const OUTLINE_PX = 2;        // band outline thickness, in image pixels (≈ 8 m)

const renderRiskImage = (points) => {
  const lat0 = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const mLat = 110574, mLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const sigmaM = HEAT_RADIUS_M / 2;
  const marginM = sigmaM * 3.2;

  // Area covered by the image: all cases plus a margin
  const north = Math.max(...points.map((p) => p.lat)) + marginM / mLat;
  const south = Math.min(...points.map((p) => p.lat)) - marginM / mLat;
  const east = Math.max(...points.map((p) => p.lng)) + marginM / mLng;
  const west = Math.min(...points.map((p) => p.lng)) - marginM / mLng;
  const w = Math.min(4000, Math.ceil(((east - west) * mLng) / METERS_PER_PX));
  const h = Math.min(4000, Math.ceil(((north - south) * mLat) / METERS_PER_PX));
  const pxLat = (north - south) / h, pxLng = (east - west) / w;
  const mPerPxX = ((east - west) * mLng) / w, mPerPxY = ((north - south) * mLat) / h;

  // 1) Risk value on a coarse grid: every case adds a soft bump, nearby bumps merge
  const step = 3;
  const gw = Math.ceil(w / step) + 2, gh = Math.ceil(h / step) + 2;
  const grid = new Float32Array(gw * gh);
  const k = 1 / (2 * sigmaM * sigmaM);
  const reachM = sigmaM * 2.6;
  points.forEach((p) => {
    const wgt = Math.min(1.5, Math.max(0, p.weight));
    if (wgt <= 0) return;
    const cx = (p.lng - west) / pxLng, cy = (north - p.lat) / pxLat;     // image pixels
    const rx = reachM / mPerPxX, ry = reachM / mPerPxY;
    const gx0 = Math.max(0, Math.floor((cx - rx) / step)), gx1 = Math.min(gw - 1, Math.ceil((cx + rx) / step));
    const gy0 = Math.max(0, Math.floor((cy - ry) / step)), gy1 = Math.min(gh - 1, Math.ceil((cy + ry) / step));
    for (let gy = gy0; gy <= gy1; gy++) {
      const dy = (gy * step - cy) * mPerPxY;
      for (let gx = gx0; gx <= gx1; gx++) {
        const dx = (gx * step - cx) * mPerPxX;
        grid[gy * gw + gx] += wgt * Math.exp(-(dx * dx + dy * dy) * k);
      }
    }
  });

  // 2) Uneven edges: stretch/shrink the value with map-anchored noise
  for (let gy = 0; gy < gh; gy++) {
    const lat = north - gy * step * pxLat;
    for (let gx = 0; gx < gw; gx++) {
      const idx = gy * gw + gx;
      if (grid[idx] < 0.02) continue;
      grid[idx] *= 0.6 + 0.8 * edgeNoise(lat, west + gx * step * pxLng);
    }
  }

  // 3) Every pixel → colour band
  const band = new Int8Array(w * h).fill(-1);
  for (let y = 0; y < h; y++) {
    const fy = y / step, gy = Math.floor(fy), ty = fy - gy;
    for (let x = 0; x < w; x++) {
      const fx = x / step, gx = Math.floor(fx), tx = fx - gx;
      const i0 = gy * gw + gx;
      const v = (grid[i0] * (1 - tx) + grid[i0 + 1] * tx) * (1 - ty)
              + (grid[i0 + gw] * (1 - tx) + grid[i0 + gw + 1] * tx) * ty;
      let b = -1;
      for (let n = RISK_BANDS.length - 1; n >= 0; n--) { if (v >= RISK_BANDS[n][0]) { b = n; break; } }
      band[y * w + x] = b;
    }
  }

  // 4) Paint: band colour, darker outline where a band meets a lower one
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const lowerNear = (x, y, b) => {
    for (let o = 1; o <= OUTLINE_PX; o++) {
      if (x - o < 0 || band[y * w + x - o] < b) return true;
      if (x + o >= w || band[y * w + x + o] < b) return true;
      if (y - o < 0 || band[(y - o) * w + x] < b) return true;
      if (y + o >= h || band[(y + o) * w + x] < b) return true;
    }
    return false;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const b = band[i];
      if (b < 0) continue;
      const [, col, alpha] = RISK_BANDS[b];
      const o = i * 4;
      if (lowerNear(x, y, b)) {
        d[o] = col[0] * 0.55; d[o + 1] = col[1] * 0.55; d[o + 2] = col[2] * 0.55; d[o + 3] = 235;
      } else {
        d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = alpha * 255;
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return { url: canvas.toDataURL('image/png'), bounds: { north, south, east, west } };
};

// Use: const heat = createHeatLayer(window.google.maps); heat.setMap(map);
//      heat.setPoints([{ lat, lng, weight }]) to show, heat.setPoints([]) to hide.
export const createHeatLayer = (gm) => {
  let map = null;
  let overlay = null;
  let lastPoints = null;
  let job = null;

  const hide = () => { if (overlay) overlay.setMap(null); };

  return {
    setMap(m) {
      map = m;
      if (!m) hide();
      else if (overlay && lastPoints && lastPoints.length) overlay.setMap(m);
    },
    setPoints(points) {
      const pts = (points || []).filter((p) => p.weight > 0.01);
      if (!pts.length) { hide(); return; }
      if (overlay && points === lastPoints) { if (map) overlay.setMap(map); return; }   // same data: just show it again
      lastPoints = points;
      clearTimeout(job);
      job = setTimeout(() => {           // let the button update first, then draw
        const { url, bounds } = renderRiskImage(pts);
        hide();
        overlay = new gm.GroundOverlay(url, bounds, { clickable: false, opacity: 1 });
        if (map && lastPoints === points) overlay.setMap(map);
      }, 0);
    },
    draw() { /* nothing to do: Google moves and scales the image itself */ },
  };
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
  .rf-legend { position: absolute; left: 12px; bottom: 24px; z-index: 10; width: 260px; max-width: calc(100% - 80px); padding: 0.7rem 0.85rem; border-radius: 12px;
    background: rgba(13,20,36,0.82); backdrop-filter: blur(8px); box-shadow: 0 6px 20px rgba(0,0,0,0.25); color: #fff; }
  .rf-legend-title { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #cfd6e4; margin-bottom: 0.45rem; }
  .rf-legend-bands { display: flex; gap: 2px; }
  .rf-legend-bands span { flex: 1; height: 12px; border: 1.5px solid; }
  .rf-legend-bands span:first-child { border-radius: 4px 0 0 4px; }
  .rf-legend-bands span:last-child { border-radius: 0 4px 4px 0; }
  .rf-legend-scale { display: flex; justify-content: space-between; font-size: 0.72rem; color: #cfd6e4; margin-top: 0.3rem; }
  .rf-legend-note { font-size: 0.7rem; color: #a9b4cc; margin-top: 0.45rem; line-height: 1.4; }

  .rf-list { display: flex; flex-direction: column; overflow-y: auto; margin-right: -0.4rem; padding-right: 0.4rem; scrollbar-width: thin; }
  .rf-row { display: flex; align-items: flex-start; gap: 0.65rem; padding: 0.6rem 0.5rem; border-bottom: 1px solid #f1f3f5; }
  .rf-row:last-child { border-bottom: none; }
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
    <div className="rf-legend-bands">
      {RISK_BANDS.map(([, c, a], i) => (
        <span key={i} style={{ background: `rgba(${c[0]},${c[1]},${c[2]},${Math.min(1, a + 0.2)})`, borderColor: `rgb(${c.map(v => Math.round(v * 0.55)).join(',')})` }} />
      ))}
    </div>
    <div className="rf-legend-scale"><span>Low</span><span>Moderate</span><span>High</span></div>
    <div className="rf-legend-note">
      {empty ? 'No rabies-related reports in the last 3 months.' : 'Based on rabies and bite reports from the last 3 months. Recent and confirmed cases count more.'}
    </div>
  </div>
);

// Barangays ranked by risk
export const ForecastList = ({ forecast, rows }) => {
  const { data, loading, error } = forecast;
  if (loading) return [0, 1, 2, 3].map((i) => <div key={i} className="rf-skel" style={{ opacity: 1 - i * 0.15 }} />);
  if (error) return <div style={{ fontSize: '0.82rem', color: '#842029' }}>{error}</div>;

  const totals = data?.totals || {};
  const list = data?.barangays || [];
  return (
    <>
      <div className="rf-sum">
        <div><div className="k">Expected cases</div><div className="v">{totals.expected_30d ?? 0}</div></div>
        <div><div className="k">High-risk barangays</div><div className="v">{totals.high_risk ?? 0}</div></div>
      </div>
      <div className="rf-list" style={rows ? { maxHeight: `${rows * 62}px` } : undefined}>
        {list.map((b, i) => {
          const lv = RISK_LEVELS[b.level] || RISK_LEVELS.none;
          const tr = TRENDS[b.trend] || TRENDS.stable;
          return (
            <div key={b.id} className="rf-row">
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
            </div>
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