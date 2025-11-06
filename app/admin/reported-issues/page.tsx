"use client";

import { useState, useEffect, useRef } from 'react';

interface ReportedIssue {
  id: string;
  subject: string;
  message: string;
  category: 'technical' | 'bike_damage' | 'safety' | 'other';
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  imageUrl?: string;
  reportedBy: string;
  reportedByName?: string | null;
  reportedAt: string;
  assignedTo?: string;
  resolvedAt?: string;
  adminNotes?: string;
  bikeId?: string | null;
  bikeName?: string | null;
}

export default function AdminReportedIssuesPage() {
  const [issues, setIssues] = useState<ReportedIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<ReportedIssue | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showActions, setShowActions] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const [bikeIdToName, setBikeIdToName] = useState<Record<string, string>>({});

  const formatDateSafe = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    if (typeof value === 'string') {
      const m = value.match(/([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})/);
      if (m) return `${m[1]} ${m[2]}, ${m[3]}`;
    }
    return '—';
  };

  const formatDateTimeSafe = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    // Fallback to just month/day/year when a human string like "October 3, 2025 at ..." is stored
    return formatDateSafe(value);
  };

  const fetchIssues = async () => {
    try {
      setIsLoading(true);
      setError('');
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      const res = await fetch(`${base.replace(/\/$/, '')}/reported-issues`, { 
        cache: 'no-store',
        credentials: 'include'
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data = await res.json();
      const normalized: ReportedIssue[] = (data || []).map((d: any) => ({
        id: d.id,
        subject: d.subject,
        message: d.message,
        category: d.category,
        priority: d.priority,
        status: d.status,
        imageUrl: d.imageUrl,
        reportedBy: d.reportedBy,
        reportedByName: d.reportedByName ?? null,
        reportedAt: d.reportedAt?.toDate ? d.reportedAt.toDate().toISOString() : d.reportedAt,
        assignedTo: d.assignedTo,
        resolvedAt: d.resolvedAt?.toDate ? d.resolvedAt.toDate().toISOString() : d.resolvedAt,
        adminNotes: d.adminNotes,
        bikeId: d.bikeId ?? null,
        bikeName: d.bikeName ?? null,
      }));
      setIssues(normalized);
    } catch (e: any) {
      console.error('Failed loading issues', e);
      setError(e?.message || 'Failed to load issues');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
    // preload bike names for quick lookup
    (async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
        const bres = await fetch(`${base.replace(/\/$/, '')}/bikes`, { credentials: 'include', cache: 'no-store' });
        const bjson = await bres.json();
        if (bjson?.success && Array.isArray(bjson.bikes)) {
          const map: Record<string, string> = {};
          bjson.bikes.forEach((b: any) => { map[b.id] = b.name || b.id; });
          setBikeIdToName(map);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!showActions) return;
    function handleClickOutside(e: MouseEvent) {
      const el = actionsRef.current;
      if (el && !el.contains(e.target as Node)) setShowActions(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActions]);

  const filteredIssues = issues.filter(issue => {
    const matchesStatus = filterStatus === 'all' || issue.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || issue.priority === filterPriority;
    const matchesCategory = filterCategory === 'all' || issue.category === filterCategory;
    const q = (searchQuery || '').toLowerCase();
    const toL = (v: unknown) => (typeof v === 'string' ? v : '').toLowerCase();
    const matchesSearch = toL(issue.subject).includes(q) ||
                         toL(issue.message).includes(q) ||
                         toL(issue.reportedBy).includes(q) ||
                         toL(issue.reportedByName).includes(q);
    
    return matchesStatus && matchesPriority && matchesCategory && matchesSearch;
  });

  const totalCount = issues.length;
  const openCount = issues.filter(i => i.status === 'open').length;
  const inProgressCount = issues.filter(i => i.status === 'in_progress').length;
  const resolvedCount = issues.filter(i => i.status === 'resolved').length;
  const closedCount = issues.filter(i => i.status === 'closed').length;

  const toCsvValue = (value: any): string => {
    const s = value == null ? '' : String(value);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };

  const exportCsv = () => {
    const headers = ['ID','Subject','Message','Category','Priority','Status','Reported By','Reported At','Resolved At','Assigned To','Admin Notes'];
    const lines: string[] = [];
    lines.push(headers.join(','));
    filteredIssues.forEach((it) => {
      const row = [
        it.id,
        it.subject,
        it.message || '',
        it.category,
        it.priority,
        it.status,
        it.reportedByName || it.reportedBy,
        it.reportedAt ? new Date(it.reportedAt).toISOString() : '',
        it.resolvedAt ? new Date(it.resolvedAt).toISOString() : '',
        it.assignedTo || '',
        it.adminNotes || ''
      ];
      lines.push(row.map(toCsvValue).join(','));
    });
    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    a.href = url;
    a.download = `reported_issues_${iso}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return '#dc2626';
      case 'in_progress': return '#f59e0b';
      case 'resolved': return '#22c55e';
      case 'closed': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#dc2626';
      case 'medium': return '#f59e0b';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'technical': return '💻';
      case 'bike_damage': return '🚲';
      case 'safety': return '⚠️';
      case 'other': return '📝';
      default: return '📝';
    }
  };

  const handleStatusUpdate = async (issueId: string, status: string, notes?: string) => {
    try {
      const base = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      await fetch(`${base.replace(/\/$/, '')}/reported-issues`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: issueId,
          status,
          adminNotes: notes,
          resolvedAt: status === 'resolved' ? new Date().toISOString() : null,
          assignedTo: status !== 'open' ? 'admin@batstate-u.edu.ph' : null,
        }),
      });
      setIssues(prev => prev.map(issue => {
        if (issue.id === issueId) {
          return {
            ...issue,
            status: status as any,
            adminNotes: notes || issue.adminNotes,
            resolvedAt: status === 'resolved' ? new Date().toISOString() : undefined,
            assignedTo: status !== 'open' ? 'admin@batstate-u.edu.ph' : undefined
          };
        }
        return issue;
      }));
    } catch (e) {
      console.error('Failed to update status', e);
    } finally {
      setShowModal(false);
      setSelectedIssue(null);
      setAdminNotes('');
      setNewStatus('');
    }
  };

  const openModal = (issue: ReportedIssue) => {
    setSelectedIssue(issue);
    setNewStatus(issue.status);
    setAdminNotes(issue.adminNotes || '');
    setShowModal(true);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg,rgb(247, 248, 250) 0%,rgb(247, 248, 250) 50%,rgb(247, 248, 250) 100%)',
      padding: '32px 24px'
    }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ 
            background: 'linear-gradient(135deg, rgba(25, 118, 210, 0.95) 0%, rgba(13, 71, 161, 0.95) 100%)',
            borderRadius: 20, 
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)', 
            border: '1px solid rgba(255, 255, 255, 0.1)', 
            padding: '48px 32px',
            marginBottom: 32,
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
              pointerEvents: 'none'
            }} />
            
            <h1 style={{ 
              color: '#ffffff', 
              fontWeight: 800, 
              fontSize: 42, 
              marginBottom: 16,
              textShadow: '0 2px 16px rgba(0, 0, 0, 0.3)',
              letterSpacing: '-0.5px',
              position: 'relative',
              zIndex: 1
            }}>
              Reported Issues
            </h1>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.95)', 
              fontSize: 18, 
              marginBottom: 20,
              fontWeight: 500,
              position: 'relative',
              zIndex: 1
            }}>
              Manage and resolve user-reported issues
            </p>

            {/* Stats */}
            <div style={{
              display: 'flex',
              gap: 12,
              justifyContent: 'center',
              flexWrap: 'wrap',
              marginBottom: 18,
              position: 'relative',
              zIndex: 1
            }}>
              {[{label:'Total',value:totalCount,color:'#ffffff'},
                {label:'Open',value:openCount,color:'#dc2626'},
                {label:'In Progress',value:inProgressCount,color:'#f59e0b'},
                {label:'Resolved',value:resolvedCount,color:'#22c55e'},
                {label:'Closed',value:closedCount,color:'#6b7280'}].map((s,idx) => (
                <div key={idx} style={{
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(6px)',
                  color: '#fff',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'baseline'
                }}>
                  <span style={{ fontSize: 12, opacity: 0.9 }}>{s.label}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.value}</span>
                </div>
              ))}
            </div>

            {/* Search and Filters */}
            <div style={{ 
              display: 'flex', 
              gap: 12, 
              justifyContent: 'center', 
              flexWrap: 'wrap',
              alignItems: 'center',
              maxWidth: 900,
              margin: '0 auto',
              position: 'sticky',
              top: 12,
              zIndex: 2
            }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
                <input
                  type="text"
                  placeholder="Search issues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 48px',
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: 12,
                    fontSize: 15,
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#1e293b',
                    outline: 'none',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                    fontWeight: 500
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#ffffff';
                    e.target.style.background = '#ffffff';
                    e.target.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                    e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  }}
                />
                <svg 
                  width="20" 
                  height="20" 
                  fill="none" 
                  stroke="#64748b" 
                  strokeWidth="2" 
                  viewBox="0 0 24 24"
                  style={{
                    position: 'absolute',
                    left: 16,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    pointerEvents: 'none'
                  }}
                >
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  padding: '14px 16px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 12,
                  fontSize: 15,
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#1e293b',
                  outline: 'none',
                  minWidth: 140,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  fontWeight: 500
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ffffff';
                  e.target.style.background = '#ffffff';
                  e.target.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                  e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                style={{
                  padding: '14px 16px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 12,
                  fontSize: 15,
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#1e293b',
                  outline: 'none',
                  minWidth: 140,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  fontWeight: 500
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ffffff';
                  e.target.style.background = '#ffffff';
                  e.target.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                  e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
              >
                <option value="all">All Priority</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  padding: '14px 16px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 12,
                  fontSize: 15,
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#1e293b',
                  outline: 'none',
                  minWidth: 150,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                  fontWeight: 500
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#ffffff';
                  e.target.style.background = '#ffffff';
                  e.target.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                  e.target.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                }}
              >
                <option value="all">All Categories</option>
                <option value="technical">Technical</option>
                <option value="bike_damage">Bike Damage</option>
                <option value="safety">Safety</option>
                <option value="other">Other</option>
              </select>
              <button
                onClick={() => fetchIssues()}
                style={{
                  padding: '14px 16px',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: 12,
                  fontSize: 15,
                  background: '#0ea5e9',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 700,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                }}
              >
                Refresh
              </button>
              <div ref={actionsRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <button
                  onClick={() => setShowActions(v => !v)}
                  aria-label="More actions"
                  title="More actions"
                  style={{
                    width: 40,
                    height: 40,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                    border: '2px solid rgba(255, 255, 255, 0.2)',
                    background: 'transparent',
                    color: '#ffffff',
                    cursor: 'pointer'
                  }}
                >
                  ⋯
                </button>
                {showActions && (
                  <div style={{ position: 'absolute', right: 0, top: '110%', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.2)', minWidth: 160, zIndex: 10 }}>
                    <button
                      onClick={() => { exportCsv(); setShowActions(false); }}
                      style={{ width: '100%', textAlign: 'left', padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: '#0f172a', fontWeight: 700 }}
                    >
                      Export CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Issues List */}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.98)', 
            borderRadius: 20, 
            border: '1px solid rgba(0, 0, 0, 0.08)', 
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
          }}>
            {isLoading && (
              <div style={{ padding: 28 }}>
                {[...Array(4)].map((_,i) => (
                  <div key={i} style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 120px',
                    gap: 16,
                    alignItems: 'center',
                    padding: '18px 0',
                    borderBottom: i<3 ? '1px solid rgba(0,0,0,0.06)' : 'none'
                  }}>
                    <div style={{ height: 16, width: 16, borderRadius: 4, background: '#e5e7eb' }} />
                    <div>
                      <div style={{ height: 14, width: '40%', borderRadius: 6, background: '#e5e7eb', marginBottom: 10 }} />
                      <div style={{ height: 12, width: '70%', borderRadius: 6, background: '#eef2f7' }} />
                    </div>
                    <div style={{ height: 24, width: 96, borderRadius: 12, background: '#e5e7eb', justifySelf: 'end' }} />
                  </div>
                ))}
              </div>
            )}
            {!!error && !isLoading && (
              <div style={{ padding: 48, textAlign: 'center', color: '#b91c1c' }}>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Failed to load issues</div>
                <div style={{ color: '#7f1d1d', marginBottom: 16 }}>{error}</div>
                <button onClick={() => fetchIssues()} style={{
                  padding: '10px 16px',
                  background: '#b91c1c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}>Retry</button>
              </div>
            )}
            {filteredIssues.length === 0 ? (
              <div style={{ 
                padding: 48, 
                textAlign: 'center',
                color: '#4b5563'
              }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <h3 style={{ fontSize: 20, marginBottom: 8, color: '#374151' }}>No issues found</h3>
                <p style={{ color: '#6b7280' }}>Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              filteredIssues.map((issue, index) => (
                <div
                  key={issue.id}
                  style={{
                    borderBottom: index < filteredIssues.length - 1 ? '1px solid rgba(0, 0, 0, 0.06)' : 'none',
                    padding: '24px 28px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    borderLeft: `6px solid ${getStatusColor(issue.status)}`,
                    background: 'linear-gradient(90deg, rgba(2,132,199,0.03) 0%, transparent 14%)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to right, rgba(25, 118, 210, 0.04), rgba(25, 118, 210, 0.02))';
                    e.currentTarget.style.transform = 'translateX(4px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                  }}
                  onClick={() => openModal(issue)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                        <span style={{ 
                          fontSize: 24,
                          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
                        }}>{getCategoryIcon(issue.category)}</span>
                        <h3 style={{ 
                          color: '#1e293b', 
                          fontSize: 19, 
                          fontWeight: 700,
                          margin: 0,
                          letterSpacing: '-0.3px'
                        }}>
                          {issue.subject}
                        </h3>
                        <span style={{
                          background: getPriorityColor(issue.priority),
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '5px 10px',
                          borderRadius: 20,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                        }}>
                          {issue.priority}
                        </span>
                        <span style={{
                          background: getStatusColor(issue.status),
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '5px 10px',
                          borderRadius: 20,
                          textTransform: 'capitalize',
                          letterSpacing: '0.3px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                        }}>
                          {String(issue.status || '').replace('_', ' ') || '—'}
                        </span>
                      </div>
                      <p style={{ 
                        color: '#475569', 
                        fontSize: 15, 
                        lineHeight: 1.6,
                        margin: '0 0 14px 0',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        fontWeight: 400
                      }}>
                        {issue.message}
                      </p>
                      <div style={{ 
                        display: 'flex', 
                        gap: 12, 
                        fontSize: 13, 
                        color: '#64748b',
                        flexWrap: 'wrap',
                        alignItems: 'center'
                      }}>
                        <span style={{ fontWeight: 600 }}>👤 {issue.reportedByName || (typeof issue.reportedBy === 'string' ? issue.reportedBy.split('@')[0] : '—')}</span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ fontWeight: 500 }}>📅 {formatDateSafe(issue.reportedAt)}</span>
                        {issue.assignedTo && (
                          <>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span style={{ fontWeight: 500 }}>🔧 Assigned</span>
                          </>
                        )}
                      </div>
                    </div>
                    {issue.imageUrl && (
                      <div style={{ marginLeft: 20, flexShrink: 0 }}>
                        <img 
                          src={issue.imageUrl} 
                          alt="Issue" 
                          style={{ 
                            width: 80, 
                            height: 80, 
                            objectFit: 'cover',
                            borderRadius: 12,
                            border: '2px solid rgba(0, 0, 0, 0.08)',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                            transition: 'transform 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      {/* Modal */}
      {showModal && selectedIssue && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 16,
            padding: 32,
            maxWidth: 600,
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            border: '1px solid var(--border-color)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
            color: '#000'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ 
                color: '#000', 
                fontSize: 24, 
                fontWeight: 700,
                margin: 0
              }}>
                Issue Details
              </h2>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#000'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>{getCategoryIcon(selectedIssue.category)}</span>
                <h3 style={{ 
                  color: '#000', 
                  fontSize: 20, 
                  fontWeight: 600,
                  margin: 0
                }}>
                  {selectedIssue.subject}
                </h3>
              </div>
              
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <span style={{
                  background: getPriorityColor(selectedIssue.priority),
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: 12,
                  textTransform: 'uppercase'
                }}>
                  {selectedIssue.priority}
                </span>
                <span style={{
                  background: getStatusColor(selectedIssue.status),
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  padding: '4px 8px',
                  borderRadius: 12,
                  textTransform: 'capitalize'
                }}>
                  {selectedIssue.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: '#ffffff', border: '1px solid var(--border-color)' }}>
              <h4 style={{ 
                color: '#000', 
                fontSize: 16, 
                fontWeight: 600,
                marginBottom: 8
              }}>
                Description
              </h4>
              <p style={{ 
                color: '#000', 
                fontSize: 14, 
                lineHeight: 1.6,
                margin: 0
              }}>
                {selectedIssue.message}
              </p>
            </div>

            {selectedIssue.imageUrl && (
              <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: '#ffffff', border: '1px solid var(--border-color)' }}>
                <h4 style={{ 
                  color: '#000', 
                  fontSize: 16, 
                  fontWeight: 600,
                  marginBottom: 8
                }}>
                  Attached Image
                </h4>
                <img 
                  src={selectedIssue.imageUrl} 
                  alt="Issue" 
                  style={{ 
                    maxWidth: '100%', 
                    maxHeight: 300, 
                    borderRadius: 8,
                    border: '1px solid var(--border-color)'
                  }} 
                />
              </div>
            )}

            <div style={{ marginBottom: 20, padding: 16, borderRadius: 12, background: '#ffffff', border: '1px solid var(--border-color)' }}>
              <h4 style={{ 
                color: '#000', 
                fontSize: 16, 
                fontWeight: 600,
                marginBottom: 8
              }}>
                Issue Information
              </h4>
              <div style={{ fontSize: 14, color: '#000', lineHeight: 1.6 }}>
                <p><strong>Reported by:</strong> {selectedIssue.reportedByName || selectedIssue.reportedBy.split('@')[0]}</p>
                <p><strong>Reported at:</strong> {formatDateTimeSafe(selectedIssue.reportedAt)}</p>
                <p>
                  <strong>Bike:</strong> {selectedIssue.bikeId ? (bikeIdToName[selectedIssue.bikeId] || selectedIssue.bikeName || selectedIssue.bikeId) : (selectedIssue.bikeName || '—')}
                </p>
                {selectedIssue.assignedTo && (
                  <p><strong>Assigned to:</strong> {selectedIssue.assignedTo}</p>
                )}
                {selectedIssue.resolvedAt && (
                  <p><strong>Resolved at:</strong> {formatDateTimeSafe(selectedIssue.resolvedAt)}</p>
                )}
              </div>
            </div>

            <div style={{ marginBottom: 24, padding: 16, borderRadius: 12, background: '#ffffff', border: '1px solid var(--border-color)' }}>
              <h4 style={{ 
                color: '#000', 
                fontSize: 16, 
                fontWeight: 600,
                marginBottom: 8
              }}>
                Update Status
              </h4>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid var(--border-color)',
                  borderRadius: 8,
                  fontSize: 16,
                  background: 'var(--bg-primary)',
                  color: '#000',
                  outline: 'none',
                  marginBottom: 12
                }}
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add admin notes or resolution details..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #cbd5e1',
                  borderRadius: 8,
                  fontSize: 16,
                  background: 'var(--bg-primary)',
                  color: '#000',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#0ea5e9';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.2)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ 
              display: 'flex', 
              gap: 12, 
              justifyContent: 'flex-end' 
            }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: '12px 24px',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '2px solid var(--border-color)',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusUpdate(selectedIssue.id, newStatus, adminNotes)}
                style={{
                  padding: '12px 24px',
                  background: '#1976d2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
