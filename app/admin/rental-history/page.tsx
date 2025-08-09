"use client";
import { useEffect, useState } from "react";

interface HistoryItem {
  id: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  bike: { id: string; name: string };
  application: { id: string; firstName: string; lastName: string; email: string };
}

export default function AdminRentalHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/rental-history");
      const data = await res.json();
      if (data.success) setHistory(data.history);
      else setError(data.error || "Failed to fetch history");
    } catch {
      setError("Failed to fetch history");
    }
    setLoading(false);
  }

  const filtered = history.filter((h) => {
    const needle = query.toLowerCase();
    return (
      h.user?.name?.toLowerCase().includes(needle) ||
      h.user?.email?.toLowerCase().includes(needle) ||
      h.bike?.name?.toLowerCase().includes(needle) ||
      `${h.application?.firstName} ${h.application?.lastName}`.toLowerCase().includes(needle)
    );
  });

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <h2 style={{ color: '#1976d2' }}>Loading rental history...</h2>
      </div>
    );
  }

  return (
    <div style={{ padding: '48px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', padding: 32 }}>
          <h1 style={{ color: '#0f172a', fontWeight: 800, fontSize: 32, marginBottom: 24, textAlign: 'center' }}>
            Rental History
          </h1>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by user, email, or bike..."
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1.5px solid #e0e0e0',
                fontSize: 16,
                minWidth: 260,
                outline: 'none',
              }}
            />
          </div>
          {error && <div style={{ color: '#b22222', fontWeight: 600, marginBottom: 18 }}>{error}</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#0f172a' }}>
                <th style={{ padding: 12, textAlign: 'left' }}>User</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Email</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Bike</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Start</th>
                <th style={{ padding: 12, textAlign: 'left' }}>End</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid #e5e7eb', color: '#111111' }}>
                  <td style={{ padding: 10 }}>{h.user?.name || `${h.application?.firstName} ${h.application?.lastName}`}</td>
                  <td style={{ padding: 10 }}>{h.user?.email || h.application?.email}</td>
                  <td style={{ padding: 10 }}>{h.bike?.name}</td>
                  <td style={{ padding: 10 }}>{new Date(h.startDate).toLocaleString()}</td>
                  <td style={{ padding: 10 }}>{new Date(h.endDate).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


