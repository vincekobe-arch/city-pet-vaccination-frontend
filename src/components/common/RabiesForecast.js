// components/common/RabiesForecast.jsx
// Shared by the admin and community Map Status pages:
//   • useRabiesForecast() – loads the forecast from GET /reports/forecast
//   • createHeatLayer()   – draws the rabies risk map (weather-radar style) on a Google map
//   • HeatLegend          – the colour legend shown on the map
//   • ForecastList        – barangays ranked by forecast risk (read-only)
import React, { useState, useEffect, useCallback } from 'react';
import { contours } from 'd3-contour';
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

// The risk areas are calculated ONCE and drawn as smooth vector shapes (Google Polygons).
// Google moves and scales them itself while you pan and zoom, so the map stays smooth and
// the outlines stay sharp at every zoom level.
const CELL_M = 15;           // calculation grid: one value every 15 m

// Rounds off the corners of a ring (Chaikin smoothing), keeping it closed
const smoothRing = (ring, passes = 2) => {
  let pts = ring.slice(0, -1);
  for (let p = 0; p < passes; p++) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
      out.push([0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1], [0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1]);
    }
    pts = out;
  }
  return pts;
};

const buildRiskShapes = (points) => {
  const lat0 = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const mLat = 110574, mLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const sigmaM = HEAT_RADIUS_M / 2;
  const marginM = sigmaM * 3.2;

  // Area covered: all cases plus a margin
  const north = Math.max(...points.map((p) => p.lat)) + marginM / mLat;
  const west = Math.min(...points.map((p) => p.lng)) - marginM / mLng;
  const south = Math.min(...points.map((p) => p.lat)) - marginM / mLat;
  const east = Math.max(...points.map((p) => p.lng)) + marginM / mLng;
  const n = Math.min(1500, Math.ceil(((east - west) * mLng) / CELL_M));    // columns
  const m = Math.min(1500, Math.ceil(((north - south) * mLat) / CELL_M));  // rows
  const cellLng = (east - west) / n, cellLat = (north - south) / m;
  const cellMx = cellLng * mLng, cellMy = cellLat * mLat;

  // 1) Risk value per cell: every case adds a soft bump, nearby bumps merge
  const values = new Float64Array(n * m);
  const k = 1 / (2 * sigmaM * sigmaM);
  const reach = sigmaM * 2.6;
  points.forEach((p) => {
    const wgt = Math.min(1.5, Math.max(0, p.weight));
    const cx = (p.lng - west) / cellLng, cy = (north - p.lat) / cellLat;
    const rx = reach / cellMx, ry = reach / cellMy;
    const x0 = Math.max(0, Math.floor(cx - rx)), x1 = Math.min(n - 1, Math.ceil(cx + rx));
    const y0 = Math.max(0, Math.floor(cy - ry)), y1 = Math.min(m - 1, Math.ceil(cy + ry));
    for (let y = y0; y <= y1; y++) {
      const dy = (y - cy) * cellMy;
      for (let x = x0; x <= x1; x++) {
        const dx = (x - cx) * cellMx;
        values[y * n + x] += wgt * Math.exp(-(dx * dx + dy * dy) * k);
      }
    }
  });

  // 2) Uneven edges: stretch/shrink the value with map-anchored noise
  for (let y = 0; y < m; y++) {
    const lat = north - y * cellLat;
    for (let x = 0; x < n; x++) {
      const idx = y * n + x;
      if (values[idx] < 0.02) continue;
      values[idx] *= 0.6 + 0.8 * edgeNoise(lat, west + x * cellLng);
    }
  }

  // 3) Contour lines for each band threshold (like isobars on a weather map)
  const thresholds = RISK_BANDS.map(([t]) => t);
  const layers = contours().size([n, m]).thresholds(thresholds)(Array.from(values));
  const toLatLng = ([x, y]) => ({ lat: north - y * cellLat, lng: west + x * cellLng });
  const rings = layers.map((layer) =>
    layer.coordinates.flatMap((polygon) => polygon.map((ring) => smoothRing(ring).map(toLatLng))));

  // 4) Each band = its area minus the next band's area (so colours don't stack)
  return RISK_BANDS.map(([, col, alpha], b) => {
    const own = rings[b];
    if (!own.length) return null;
    const holes = (rings[b + 1] || []).map((r) => r.slice().reverse());
    return { paths: [...own, ...holes], col, alpha, z: b };
  }).filter(Boolean);
};

// Use: const heat = createHeatLayer(window.google.maps); heat.setMap(map);
//      heat.setPoints([{ lat, lng, weight }]) to show, heat.setPoints([]) to hide.
export const createHeatLayer = (gm) => {
  let map = null;
  let shapes = [];
  let lastPoints = null;
  let job = null;

  const show = (m) => shapes.forEach((s) => s.setMap(m));

  return {
    setMap(m) {
      map = m;
      show(m && lastPoints ? m : null);
    },
    setPoints(points) {
      const pts = (points || []).filter((p) => p.weight > 0.01);
      if (!pts.length) { show(null); return; }
      if (shapes.length && points === lastPoints) { show(map); return; }   // same data: just show it again
      lastPoints = points;
      clearTimeout(job);
      job = setTimeout(() => {           // let the button update first, then calculate
        const bands = buildRiskShapes(pts);
        show(null);
        shapes = bands.map(({ paths, col, alpha, z }) => new gm.Polygon({
          paths,
          clickable: false,
          fillColor: `rgb(${col.join(',')})`,
          fillOpacity: alpha,
          strokeColor: `rgb(${col.map((v) => Math.round(v * 0.55)).join(',')})`,
          strokeOpacity: 0.95,
          strokeWeight: 1.6,
          zIndex: 1 + z,
        }));
        if (map && lastPoints === points) show(map);
      }, 0);
    },
    draw() { /* nothing to do: Google moves and scales the shapes itself */ },
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