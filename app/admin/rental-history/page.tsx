"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import BikeLoader from "../../components/BikeLoader";

interface HistoryItem {
  id: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  bike: { id: string; name: string };
  bikeName?: string;
  college?: string;
  application: { id: string; firstName: string; lastName: string; email: string; college?: string };
  type?: 'rental' | 'rejected';
  status?: 'Completed' | 'Rejected' | 'Approved' | 'Rented';
}

export default function AdminRentalHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [showUsers, setShowUsers] = useState(false);
  const [showColleges, setShowColleges] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedCollegeName, setSelectedCollegeName] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  const usersWithHistory = useMemo(() => {
    type UserAcc = { id: string; name: string; email: string; count: number; bikes: Set<string> };
    const idToUser = new Map<string, UserAcc>();
    for (const h of history) {
      const candidate = h.user || (h.application ? { id: h.application.id, name: `${h.application.firstName} ${h.application.lastName}`.trim(), email: h.application.email } as any : null);
      if (!candidate || !candidate.id) continue;
      const key = candidate.id;
      let acc = idToUser.get(key);
      if (!acc) {
        acc = { id: key, name: candidate.name || "Unnamed", email: candidate.email || "", count: 0, bikes: new Set<string>() };
        idToUser.set(key, acc);
      }
      acc.count += 1;
      const bikeDisplayName = h.bike?.name || (h as any).bikeName;
      if (bikeDisplayName) acc.bikes.add(bikeDisplayName);
    }
    const result = Array.from(idToUser.values()).map(u => ({ ...u, bikes: Array.from(u.bikes).sort((a, b) => a.localeCompare(b)) }));
    return result.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [history]);

  const collegesWithHistory = useMemo(() => {
    const nameToAcc = new Map<string, { name: string; count: number }>();
    for (const h of history) {
      const college = (h as any).college || (h.application as any)?.college || "";
      const norm = typeof college === 'string' ? college.trim() : '';
      if (!norm) continue;
      const existing = nameToAcc.get(norm);
      if (existing) existing.count += 1;
      else nameToAcc.set(norm, { name: norm, count: 1 });
    }
    return Array.from(nameToAcc.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [history]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!showActions) return;
    function handleClickOutside(e: MouseEvent) {
      const el = actionsRef.current;
      if (el && !el.contains(e.target as Node)) {
        setShowActions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActions]);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/rental-history`, {
        credentials: 'include'
      });
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
    const matchesSearch = (
      h.user?.name?.toLowerCase().includes(needle) ||
      h.user?.email?.toLowerCase().includes(needle) ||
      h.bike?.name?.toLowerCase().includes(needle) ||
      h.bikeName?.toLowerCase().includes(needle) ||
      h.college?.toLowerCase().includes(needle) ||
      h.application?.college?.toLowerCase().includes(needle) ||
      `${h.application?.firstName} ${h.application?.lastName}`.toLowerCase().includes(needle)
    );
    const candidateUserId = (h as any).user?.id || (h as any).application?.id || "";
    const matchesUser = !selectedUserId || candidateUserId === selectedUserId;
    const collegeName = ((h as any).college || (h as any).application?.college || "").toString();
    const matchesCollege = !selectedCollegeName || collegeName.toLowerCase() === selectedCollegeName.toLowerCase();

    // Date range filter (inclusive by day)
    const fromTs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTs = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;
    const startTs = h.startDate ? new Date(h.startDate).getTime() : (h.createdAt ? new Date(h.createdAt).getTime() : null);
    const endTs = h.endDate ? new Date(h.endDate).getTime() : startTs;
    let matchesDate = true;
    if (fromTs !== null && toTs !== null) {
      // overlap check: [start,end] intersects [from,to]
      matchesDate = (startTs ?? 0) <= toTs && (endTs ?? startTs ?? 0) >= fromTs;
    } else if (fromTs !== null) {
      matchesDate = (endTs ?? startTs ?? 0) >= fromTs;
    } else if (toTs !== null) {
      matchesDate = (startTs ?? 0) <= toTs;
    }
    return matchesSearch && matchesUser && matchesCollege && matchesDate;
  });

  function toCsvValue(value: any): string {
    const s = value == null ? '' : String(value);
    if (s.includes('"') || s.includes(',') || s.includes('\n')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }

  function exportCsv() {
    const rows = filtered.map((h) => ({
      User: h.user?.name || `${h.application?.firstName} ${h.application?.lastName}`,
      Email: h.user?.email || h.application?.email,
      College: (h as any).college || h.application?.college || '',
      Bike: h.bike?.name || (h as any).bikeName || '',
      Start: h.startDate ? new Date(h.startDate).toLocaleString() : '',
      End: h.endDate ? new Date(h.endDate).toLocaleString() : '',
      Status: h.status || 'Completed',
    }));
    const headers = ['User','Email','College','Bike','Start','End','Status'];
    const lines: string[] = [];
    lines.push(headers.map(toCsvValue).join(','));
    for (const r of rows) {
      lines.push(headers.map((k) => toCsvValue((r as any)[k])).join(','));
    }
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const d = new Date();
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    a.download = `rental_history_${iso}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowActions(false);
  }

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <BikeLoader />
          <h2 style={{ color: '#1976d2', margin: 0 }}>Loading rental history...</h2>
        </div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, gap: 12, alignItems: 'center', flexWrap: 'wrap' as any }}>
            <div>
              <button
                onClick={() => { setSelectedUserId(''); setSelectedCollegeName(''); setShowUsers(false); setShowColleges(false); }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1.5px solid #e0e0e0',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Show all records"
              >
                All
              </button>
              <button
                onClick={() => setShowUsers(true)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1.5px solid #e0e0e0',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginLeft: 8
                }}
              >
                User
              </button>
              <button
                onClick={() => setShowColleges(true)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1.5px solid #e0e0e0',
                  background: '#f8fafc',
                  color: '#0f172a',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginLeft: 8
                }}
              >
                College
              </button>
            </div>
            <div ref={actionsRef} style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
              <label style={{ color: '#334155', fontSize: 14 }}>From</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e0e0e0' }} />
              <label style={{ color: '#334155', fontSize: 14 }}>To</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e0e0e0' }} />
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#0f172a', cursor: 'pointer' }}>Clear</button>
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
                  background: '#ffffff',
                  color: '#111111'
                }}
              />
              <button
                onClick={() => setShowActions(v => !v)}
                aria-label="More actions"
                style={{
                  width: 36,
                  height: 36,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  border: '1.5px solid #e0e0e0',
                  background: '#f8fafc',
                  color: '#0f172a',
                  cursor: 'pointer'
                }}
              >
                ⋯
              </button>
              {showActions && (
                <div style={{ position: 'absolute', right: 0, top: '110%', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.15)', minWidth: 180, zIndex: 10 }}>
                  <button onClick={exportCsv} style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#0f172a' }}>Export CSV</button>
                </div>
              )}
            </div>
          </div>
          {showUsers && (
            <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
              <div style={{ width: 'min(720px, 92vw)', maxHeight: '80vh', overflow: 'auto', background: '#ffffff', borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Users with History ({usersWithHistory.length})</div>
                  <button onClick={() => setShowUsers(false)} style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer', color: '#64748b' }} aria-label="Close">×</button>
                </div>
                <div style={{ padding: 16 }}>
                  
                  {usersWithHistory.length === 0 ? (
                    <div style={{ padding: 24, color: '#475569' }}>No users found.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', color: '#0f172a' }}>
                          <th style={{ padding: 10, textAlign: 'left' }}>Name</th>
                          <th style={{ padding: 10, textAlign: 'left' }}>Email</th>
                          <th style={{ padding: 10, textAlign: 'right' }}>Records</th>
                          <th style={{ padding: 10, textAlign: 'right' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {usersWithHistory.map(u => (
                          <tr key={u.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: 10, color: '#0f172a' }}>{u.name}</td>
                            <td style={{ padding: 10, color: '#334155' }}>{u.email || '-'}</td>
                            <td style={{ padding: 10, textAlign: 'right', color: '#0f172a' }}>{u.count}</td>
                            <td style={{ padding: 10, textAlign: 'right' }}>
                              <button
                                onClick={() => { setSelectedUserId(u.id); setSelectedCollegeName(''); setShowUsers(false); }}
                                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Filter
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
          {showColleges && (
            <div style={{ position: 'fixed', inset: 0 as any, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
              <div style={{ width: 'min(720px, 92vw)', maxHeight: '80vh', overflow: 'auto', background: '#ffffff', borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Colleges with History ({collegesWithHistory.length})</div>
                  <button onClick={() => setShowColleges(false)} style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer', color: '#64748b' }} aria-label="Close">×</button>
                </div>
                <div style={{ padding: 16 }}>
                  
                  {collegesWithHistory.length === 0 ? (
                    <div style={{ padding: 24, color: '#475569' }}>No colleges found.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', color: '#0f172a' }}>
                          <th style={{ padding: 10, textAlign: 'left' }}>College</th>
                          <th style={{ padding: 10, textAlign: 'right' }}>Records</th>
                          <th style={{ padding: 10, textAlign: 'right' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {collegesWithHistory.map(c => (
                          <tr key={c.name} style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <td style={{ padding: 10, color: '#0f172a' }}>{c.name}</td>
                            <td style={{ padding: 10, textAlign: 'right', color: '#0f172a' }}>{c.count}</td>
                            <td style={{ padding: 10, textAlign: 'right' }}>
                              <button
                                onClick={() => { setSelectedCollegeName(c.name); setSelectedUserId(''); setShowColleges(false); }}
                                style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, cursor: 'pointer' }}
                              >
                                Filter
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
          {error && <div style={{ color: '#b22222', fontWeight: 600, marginBottom: 18 }}>{error}</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', color: '#0f172a' }}>
                <th style={{ padding: 12, textAlign: 'left' }}>User</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Email</th>
                <th style={{ padding: 12, textAlign: 'left' }}>College</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Bike</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Start</th>
                <th style={{ padding: 12, textAlign: 'left' }}>End</th>
                <th style={{ padding: 12, textAlign: 'left' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid #e5e7eb', color: '#111111' }}>
                  <td style={{ padding: 10 }}>{h.user?.name || `${h.application?.firstName} ${h.application?.lastName}`}</td>
                  <td style={{ padding: 10 }}>{h.user?.email || h.application?.email}</td>
                  <td style={{ padding: 10 }}>{h.college || h.application?.college || '-'}</td>
                  <td style={{ padding: 10 }}>{h.bike?.name || h.bikeName || '-'}</td>
                  <td style={{ padding: 10 }}>{h.startDate ? new Date(h.startDate).toLocaleString() : '-'}</td>
                  <td style={{ padding: 10 }}>{h.endDate ? new Date(h.endDate).toLocaleString() : '-'}</td>
                  <td style={{ padding: 10, fontWeight: 700, color: h.status === 'Rejected' ? '#ef4444' : h.status === 'Approved' ? '#22c55e' : h.status === 'Rented' ? '#1976d2' : '#111111' }}>{h.status || 'Completed'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


