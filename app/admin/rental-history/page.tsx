"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import BikeLoader from "../../components/BikeLoader";
import AdminHeader from "../../components/AdminHeader";

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

  function getStatusStyles(status?: string) {
    const s = String(status || '').toLowerCase();
    if (s === 'rejected') {
      return { accent: '#ef4444', badgeBg: '#fee2e2', badgeColor: '#b91c1c', text: '#b91c1c' };
    }
    if (s === 'approved') {
      return { accent: '#3b82f6', badgeBg: '#e0f2fe', badgeColor: '#0369a1', text: '#0369a1' };
    }
    if (s === 'rented') {
      return { accent: '#1976d2', badgeBg: '#e8f0fe', badgeColor: '#1d4ed8', text: '#1d4ed8' };
    }
    // Completed / default
    return { accent: '#22c55e', badgeBg: '#e8f5ee', badgeColor: '#16a34a', text: '#16a34a' };
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
        <AdminHeader
          title="Rental History"
          subtitle="View completed, approved, and rejected rentals"
          stats={[
            { label: 'Total', value: history.length, color: '#ffffff' },
            { label: 'Completed', value: history.filter(h => h.status === 'Completed' || !h.status).length, color: '#22c55e' },
            { label: 'Rejected', value: history.filter(h => h.status === 'Rejected').length, color: '#ef4444' },
          ]}
        >
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => { setSelectedUserId(''); setSelectedCollegeName(''); setShowUsers(false); setShowColleges(false); }}
              title="Show all records"
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                border: (!selectedUserId && !selectedCollegeName) ? '2px solid rgba(255,255,255,0.35)' : '2px solid rgba(255,255,255,0.2)',
                background: (!selectedUserId && !selectedCollegeName) ? '#1976d2' : 'rgba(255,255,255,0.95)',
                color: (!selectedUserId && !selectedCollegeName) ? '#ffffff' : '#1e293b',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              All
            </button>
            <button
              onClick={() => setShowUsers(true)}
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                border: (selectedUserId ? '2px solid rgba(255,255,255,0.35)' : '2px solid rgba(255,255,255,0.2)'),
                background: (selectedUserId ? '#1976d2' : 'rgba(255,255,255,0.95)'),
                color: (selectedUserId ? '#ffffff' : '#1e293b'),
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              User
            </button>
            <button
              onClick={() => setShowColleges(true)}
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                border: (selectedCollegeName ? '2px solid rgba(255,255,255,0.35)' : '2px solid rgba(255,255,255,0.2)'),
                background: (selectedCollegeName ? '#1976d2' : 'rgba(255,255,255,0.95)'),
                color: (selectedCollegeName ? '#ffffff' : '#1e293b'),
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              College
            </button>
          </div>
        </AdminHeader>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', padding: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space_between', marginBottom: 16, gap: 12, alignItems: 'center', flexWrap: 'wrap' as any }}>
            <div ref={actionsRef} style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
              <label style={{ color: '#334155', fontSize: 14 }}>From</label>
              <input className="rental-date" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e0e0e0', background: '#ffffff', color: '#111111' }} />
              <label style={{ color: '#334155', fontSize: 14 }}>To</label>
              <input className="rental-date" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1.5px solid #e0e0e0', background: '#ffffff', color: '#111111' }} />
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
          <div style={{ overflow: 'hidden', borderRadius: 12, border: '1px solid #e5e7eb' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky' as any, top: 0, zIndex: 1 }}>
                <tr style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)', color: '#0f172a' }}>
                  <th style={{ padding: 14, textAlign: 'left' }}>User</th>
                  <th style={{ padding: 14, textAlign: 'left' }}>Email</th>
                  <th style={{ padding: 14, textAlign: 'left' }}>College</th>
                  <th style={{ padding: 14, textAlign: 'left' }}>Bike</th>
                  <th style={{ padding: 14, textAlign: 'left' }}>Start</th>
                  <th style={{ padding: 14, textAlign: 'left' }}>End</th>
                  <th style={{ padding: 14, textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h, idx) => {
                  const s = getStatusStyles(h.status);
                  return (
                    <tr
                      key={h.id}
                      style={{
                        background: idx % 2 === 0 ? '#ffffff' : '#f9fafb',
                        transition: 'background 200ms ease'
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = '#eef6ff'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = idx % 2 === 0 ? '#ffffff' : '#fcfcfd'; }}
                    >
                      <td style={{ padding: 12, borderBottom: '1px solid #eef2f7', color: '#0f172a' }}>{h.user?.name || `${h.application?.firstName} ${h.application?.lastName}`}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid #eef2f7', color: '#334155' }}>{h.user?.email || h.application?.email}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid #eef2f7', color: '#0f172a' }}>{h.college || h.application?.college || '-'}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid #eef2f7', color: '#0f172a' }}>{h.bike?.name || h.bikeName || '-'}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid #eef2f7', color: '#0f172a' }}>{h.startDate ? new Date(h.startDate).toLocaleString() : '-'}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid #eef2f7', color: '#0f172a' }}>{h.endDate ? new Date(h.endDate).toLocaleString() : '-'}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid #eef2f7' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '6px 10px',
                          borderRadius: 9999,
                          fontWeight: 800,
                          fontSize: 12,
                          background: s.badgeBg,
                          color: s.badgeColor,
                          letterSpacing: 0.3
                        }}>
                          {h.status || 'Completed'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <style>{`
        /* Make the native calendar icon black where supported */
        input.rental-date::-webkit-calendar-picker-indicator {
          filter: invert(0%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(0%) contrast(100%);
          opacity: 1;
        }
        input.rental-date::-ms-clear { display: none; }
      `}</style>
    </div>
  );
}


