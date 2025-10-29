"use client";
import { useEffect, useMemo, useState } from "react";
import AdminHeader from "../../components/AdminHeader";

type Metrics = { mae: number; mse: number; r2: number };

type Prediction = {
  id?: string;
  bikeId: string;
  predictedKmUntilMaintenance?: number | null;
  updatedAt?: string;
};

export default function AdminMaintenancePage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [training, setTraining] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [bikeIdToName, setBikeIdToName] = useState<Record<string, string>>({});
  const base = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

  function fmt(n: number | null | undefined, d = 2) {
    if (n == null || !isFinite(Number(n))) return "—";
    return Number(n).toFixed(d);
  }

  async function fetchBikes() {
    try {
      const res = await fetch(`${base}/bikes`, { credentials: 'include', cache: 'no-store' });
      const json = await res.json();
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
      const json = await res.json();
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
      const json = await res.json();
      if (!json?.success) {
        alert(json?.error || 'Training failed');
      }
      await fetchPreds();
    } catch (e: any) {
      alert(e?.message || 'Training failed');
    } finally { setTraining(false); }
  }

  useEffect(() => { fetchPreds(); fetchBikes(); }, []);

  const sortedPreds = useMemo(() => {
    const arr = [...predictions];
    arr.sort((a: any, b: any) => (a.predictedKmUntilMaintenance ?? 1e12) - (b.predictedKmUntilMaintenance ?? 1e12));
    return arr as any[];
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

      {metrics ? (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginTop: 16 }}>
          <div style={{ borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>MAE</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{fmt(metrics.mae, 2)}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Lower is better</div>
          </div>
          <div style={{ borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>MSE</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{fmt(metrics.mse, 2)}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Lower is better</div>
          </div>
          <div style={{ borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', padding: 16, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 12, color: '#6b7280' }}>R²</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{fmt(metrics.r2, 3)}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>Closer to 1 is better</div>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 16, borderRadius: 12, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', padding: 16 }}>No metrics yet. Train the model to generate predictions.</div>
      )}

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
                {sortedPreds.map((p) => {
                  const name = bikeIdToName[p.bikeId] || p.bikeId;
                  return (
                    <tr key={p.id || p.bikeId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: 600 }}>{name}</div>
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>{p.bikeId}</div>
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
