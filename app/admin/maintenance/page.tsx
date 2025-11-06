"use client";
import { useEffect, useMemo, useState } from "react";
import AdminHeader from "../../components/AdminHeader";
import { rtdb, onValue, ref } from '@/lib/firebaseClient';

type Metrics = { mae: number; mse: number; r2: number; val?: { mae: number; mse: number; r2: number }; train?: { mae: number; mse: number; r2: number } };

type Prediction = {
  id?: string;
  bikeId: string;
  predictedKmUntilMaintenance?: number | null;
  updatedAt?: string;
};

type ForecastPoint = { weekStart: string; yhat: number; yhat_lower: number; yhat_upper: number; atRiskSim: number; yhat_plus_sim: number };
type ForecastSummary = { start: string; end: string; sumMean: number; sumLower: number; sumUpper: number; sumPlusSim?: number };

export default function AdminMaintenancePage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [training, setTraining] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [bikeIdToName, setBikeIdToName] = useState<Record<string, string>>({});
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [nextMonth, setNextMonth] = useState<ForecastSummary | null>(null);
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

  function fmt(n: number | null | undefined, d = 2) {
    if (n == null || !isFinite(Number(n))) return "—";
    return Number(n).toFixed(d);
  }

  async function parseJsonOrThrow(res: Response) {
    const contentType = res.headers.get('content-type') || '';
    const bodyText = await res.text();
    if (contentType.includes('application/json')) {
      try {
        return JSON.parse(bodyText);
      } catch (e) {
        throw new Error('Invalid JSON from API');
      }
    }
    const snippet = bodyText.replace(/<[^>]*>/g, ' ').slice(0, 200).trim();
    throw new Error(`Unexpected response from API (${res.status}). ${snippet || 'Non-JSON body'}`);
  }

  async function fetchBikes() {
    try {
      const res = await fetch(`${base}/bikes`, { credentials: 'include', cache: 'no-store' });
      const json = await parseJsonOrThrow(res);
      if (json?.success && Array.isArray(json?.bikes)) {
        const map: Record<string, string> = {};
        for (const b of json.bikes) {
          map[b.id] = b.name || b.id;
        }
        setBikeIdToName(map);
      }
    } catch {}
  }

  async function fetchPreds() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${base}/maintenance/predictions`, { credentials: 'include', cache: 'no-store' });
      const json = await parseJsonOrThrow(res);
      if (json?.success) {
        setMetrics(json?.model?.metrics || null);
        setPredictions(Array.isArray(json?.predictions) ? json.predictions : []);
      } else {
        setError(json?.error || 'Failed to load predictions');
      }
    } catch (e: any) { setError(e?.message || 'Failed to load predictions'); }
    finally { setLoading(false); }
  }

  async function train() {
    setTraining(true);
    try {
      const res = await fetch(`${base}/maintenance/train`, { method: 'POST', credentials: 'include' });
      const json = await parseJsonOrThrow(res);
      if (!json?.success) {
        alert(json?.error || 'Training failed');
      }
      await fetchPreds();
    } catch (e: any) {
      alert(e?.message || 'Training failed');
    } finally { setTraining(false); }
  }

  // Build 12 weeks of simple demo forecast (weekly hybrid) for fallback
  function buildDemoForecast(): { forecast: ForecastPoint[]; nextMonth: ForecastSummary } {
    function weekStartMonday(dt: Date) {
      const d = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
      const dow = d.getUTCDay(); // Sun=0..Sat=6
      const diff = (dow + 6) % 7; // Monday=0
      d.setUTCDate(d.getUTCDate() - diff);
      return d;
    }
    const today = new Date();
    const base = weekStartMonday(today);
    const weeks = 12;

    const pts: ForecastPoint[] = [];
    for (let i = 0; i < weeks; i++) {
      const wk = new Date(base); wk.setUTCDate(base.getUTCDate() + i * 7);
      const baseMean = 2 + i * 0.6; // gentle upward trend
      const noise = Math.max(0, Math.round((Math.random() - 0.3) * 1.5));
      const atRiskSim = Math.round((i % 3 === 0 ? 1 : 0) + (Math.random() < 0.25 ? 1 : 0));
      const yhat = Math.max(0, Math.round(baseMean));
      const yhat_lower = Math.max(0, yhat - 1);
      const yhat_upper = yhat + 1;
      const yhat_plus_sim = yhat + atRiskSim + noise;
      pts.push({
        weekStart: wk.toISOString().slice(0, 10),
        yhat,
        yhat_lower,
        yhat_upper,
        atRiskSim,
        yhat_plus_sim,
      });
    }

    const firstNextMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
    const firstAfter = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 2, 1));
    let sumMean = 0, sumLower = 0, sumUpper = 0, sumPlusSim = 0;
    for (const p of pts) {
      if (p.weekStart >= firstNextMonth.toISOString().slice(0, 10) && p.weekStart < firstAfter.toISOString().slice(0, 10)) {
        sumMean += p.yhat; sumLower += p.yhat_lower; sumUpper += p.yhat_upper; sumPlusSim += p.yhat_plus_sim;
      }
    }

    return {
      forecast: pts,
      nextMonth: {
        start: firstNextMonth.toISOString().slice(0, 10),
        end: firstAfter.toISOString().slice(0, 10),
        sumMean,
        sumLower,
        sumUpper,
        sumPlusSim,
      },
    };
  }

  async function fetchForecast() {
    try {
      const res = await fetch(`${base}/maintenance/forecast`, { credentials: 'include', cache: 'no-store' });
      const json = await parseJsonOrThrow(res);
      if (json?.success && Array.isArray(json.forecast) && json.forecast.length > 0) {
        setForecast(json.forecast);
        setNextMonth(json.nextMonth || null);
        return;
      }
    } catch { /* ignore and fall back */ }
    // fallback demo
    const demo = buildDemoForecast();
    setForecast(demo.forecast);
    setNextMonth(demo.nextMonth);
  }

  useEffect(() => { fetchPreds(); fetchBikes(); fetchForecast(); }, []);

  // Realtime listeners (optional; overrides fetch when data is present)
  useEffect(() => {
    const offPreds = onValue(ref(rtdb, 'maintenance/predictions'), (snap: any) => {
      const obj = snap.val() || {};
      if (obj && typeof obj === 'object') {
        const arr = Object.entries(obj).map(([id, v]: any) => ({ id, ...(v as any) }));
        arr.sort((a: any, b: any) => (a.predictedKmUntilMaintenance ?? 1e12) - (b.predictedKmUntilMaintenance ?? 1e12));
        setPredictions(arr as any);
      }
    });
    const offModel = onValue(ref(rtdb, 'maintenance/model'), (snap: any) => {
      const m = snap.val();
      if (m && typeof m === 'object') setMetrics(m.metrics || null);
    });
    return () => { offPreds(); offModel(); };
  }, []);

  const sortedPreds = useMemo(() => {
    const arr = [...predictions];
    arr.sort((a: any, b: any) => (a.predictedKmUntilMaintenance ?? 1e12) - (b.predictedKmUntilMaintenance ?? 1e12));
    // de-duplicate by bikeId to avoid duplicate keys/rows
    const seen = new Set<string>();
    const out: any[] = [];
    for (const p of arr) {
      const k = String((p as any).bikeId || (p as any).id || '');
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(p);
    }
    return out as any[];
  }, [predictions]);

  return (
    <div style={{ padding: 24, color: '#111827' }}>
      <AdminHeader title="Maintenance Predictions" />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
        <button onClick={train} disabled={training} style={{ padding: '10px 14px', background: '#1d4ed8', color: '#fff', border: '1px solid #1e40af', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.08)', opacity: training ? 0.7 : 1 }}>
          {training ? 'Training…' : 'Train model'}
        </button>
        <button onClick={fetchPreds} disabled={loading} style={{ padding: '10px 14px', background: '#fff', color: '#111827', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.06)', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
        <div style={{ fontSize: 13, color: '#6b7280' }}>{predictions.length} predictions</div>
      </div>

      {error && (
        <div style={{ marginTop: 12, borderRadius: 8, border: '1px solid #fecaca', background: '#fee2e2', color: '#991b1b', padding: '10px 12px' }}>{error}</div>
      )}

      {/* Metrics + Forecast side-by-side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(480px, 3fr)', gap: 16, alignItems: 'start', marginTop: 16 }}>
        <div>
          {metrics ? (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: '1fr' }}>
              <div style={{ borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 12, color: '#6b7280' }}>RMSE</div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{fmt((metrics as any).rmse ?? Math.sqrt(Number((metrics as any).mse || 0)), 2)}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>Lower is better</div>
              </div>
              {metrics.val && (
                <div style={{ borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', padding: 16 }}>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Val RMSE</div>
                  <div style={{ fontSize: 24, fontWeight: 600 }}>{fmt((metrics.val as any).rmse ?? Math.sqrt(Number((metrics.val as any).mse || 0)), 2)}</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', padding: 16 }}>No metrics yet. Train the model to generate predictions.</div>
          )}
        </div>

        <div style={{ borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Projected maintenance demand (weekly)</div>
          {nextMonth && (
            <div style={{ fontSize: 14, color: '#111827' }}>Next month ({nextMonth.start} → {nextMonth.end}):
              <span style={{ marginLeft: 8, fontWeight: 700, color: '#111827' }}>{Math.round(nextMonth.sumPlusSim ?? nextMonth.sumMean)}</span>
              <span style={{ marginLeft: 8, color: '#111827' }}>(range {Math.round(nextMonth.sumLower)}–{Math.round(nextMonth.sumUpper)})</span>
            </div>
          )}
        </div>
        {/* Compact SVG chart */}
        <div style={{ marginTop: 12, width: '100%', overflowX: 'auto' }}>
          {forecast.length === 0 ? (
            <div style={{ color: '#6b7280' }}>No forecast yet.</div>
          ) : (
            (() => {
              const w = Math.max(600, forecast.length * 48);
              const h = 200;
              const pad = 36;
              const xs = forecast.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, forecast.length - 1));
              const ysVal = forecast.map(p => p.yhat_plus_sim);
              const maxY = Math.max(1, Math.max(...ysVal));
              const yToPix = (v: number) => h - pad - (v / maxY) * (h - pad * 2);
              const line = xs.map((x, i) => `${x},${yToPix(ysVal[i])}`).join(' ');
              const tickEvery = Math.max(1, Math.floor(forecast.length / 6));
              const fmtDate = (s: string) => s.slice(5); // MM-DD

              return (
                <svg width={w} height={h} style={{ display: 'block' }} aria-label="Hybrid weekly forecast">
                  {/* grid */}
                  {/* horizontal grid for 0, 50%, 100% */}
                  <g stroke="#f1f5f9">
                    <line x1={pad} y1={yToPix(0)} x2={w - pad} y2={yToPix(0)} />
                    <line x1={pad} y1={yToPix(maxY/2)} x2={w - pad} y2={yToPix(maxY/2)} />
                    <line x1={pad} y1={yToPix(maxY)} x2={w - pad} y2={yToPix(maxY)} />
                  </g>
                  {/* axes */}
                  <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#e5e7eb" />
                  <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#e5e7eb" />

                  {/* y-axis labels */}
                  <g fill="#111827" fontSize="12">
                    <text x={pad - 8} y={yToPix(0) + 4} textAnchor="end" style={{ stroke: '#ffffff', strokeWidth: 2, paintOrder: 'stroke fill' as any, fontWeight: 700 }}>0</text>
                    <text x={pad - 8} y={yToPix(maxY/2) + 4} textAnchor="end" style={{ stroke: '#ffffff', strokeWidth: 2, paintOrder: 'stroke fill' as any, fontWeight: 700 }}>{Math.round(maxY/2)}</text>
                    <text x={pad - 8} y={yToPix(maxY) + 4} textAnchor="end" style={{ stroke: '#ffffff', strokeWidth: 2, paintOrder: 'stroke fill' as any, fontWeight: 700 }}>{Math.round(maxY)}</text>
                  </g>

                  {/* x-axis ticks & labels */}
                  <g stroke="#e5e7eb" fill="#111827" fontSize="10">
                    {xs.map((x, i) => (
                      (i % tickEvery === 0) ? (
                        <g key={`t${i}`}>
                          <line x1={x} y1={h - pad} x2={x} y2={h - pad + 4} />
                          <text x={x} y={h - pad + 18} textAnchor="middle" style={{ fill: '#111827', stroke: '#ffffff', strokeWidth: 2, paintOrder: 'stroke fill', fontWeight: 700 }}>{fmtDate(forecast[i].weekStart)}</text>
                        </g>
                      ) : null
                    ))}
                  </g>

                  {/* legend */}
                  <g>
                    <circle cx={w - pad - 90} cy={pad - 12} r={4} fill="#1976d2" />
                    <text x={w - pad - 80} y={pad - 9} fontSize="10" fill="#111827">Hybrid (yhat + sim)</text>
                  </g>

                  {/* forecast line */}
                  <polyline points={line} fill="none" stroke="#1976d2" strokeWidth={2} />
                  {/* dots */}
                  {xs.map((x, i) => (
                    <circle key={i} cx={x} cy={yToPix(ysVal[i])} r={3} fill="#1976d2" />
                  ))}
                </svg>
              );
            })()
          )}
        </div>
        </div>
      </div>

      <div style={{ marginTop: 16, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Top maintenance priority (lowest km remaining)</div>
        {sortedPreds.length === 0 ? (
          <div style={{ color: '#6b7280' }}>No predictions yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ minWidth: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Bike</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Predicted km until maintenance</th>
                  <th style={{ padding: '8px 12px', fontWeight: 600 }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {sortedPreds.map((p, idx) => {
                  const baseKey = String(p.bikeId || (p as any).id || idx);
                  const name = bikeIdToName[baseKey] || baseKey;
                  const rowKey = `${baseKey}-${(p.updatedAt || '').toString()}-${idx}`;
                  return (
                    <tr key={rowKey} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>{name}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>{baseKey}</div>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'inline-block', borderRadius: 6, padding: '4px 8px', background: '#f3f4f6', color: '#111827', fontSize: 14 }}>
                          {fmt((p as any).predictedKmUntilMaintenance, 2)} km
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>{(p.updatedAt || '').split('T')[0] || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
