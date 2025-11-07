"use client";
import { useEffect, useMemo, useState } from "react";
import BikeLoader from "../components/BikeLoader";
import Link from "next/link";

interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  assignedApplications: number;
  totalBikes: number;
  availableBikes: number;
  rentedBikes: number;
}

interface RecentApplication {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  createdAt: string;
}

interface RecentBike {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  distanceKm: number;
  co2SavedKg: number;
  userId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [recentBikes, setRecentBikes] = useState<RecentBike[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [rentalHistory, setRentalHistory] = useState<any[]>([]);
  const [reportedIssues, setReportedIssues] = useState<any[]>([]);
  const [usageRange, setUsageRange] = useState<'week' | 'month' | 'year'>('week');
  const [collegeRange, setCollegeRange] = useState<'week' | 'month' | 'year'>('week');
  const [forecast, setForecast] = useState<{ weekStart: string; yhat_plus_sim: number }[]>([]);
  const [nextMonthSummary, setNextMonthSummary] = useState<{ start: string; end: string; sumPlusSim?: number; sumMean?: number } | null>(null);

  // Timezone helpers: force Asia/Manila (UTC+8) regardless of client tz
  const toManila = (date: Date) => {
    const utcMs = date.getTime() + date.getTimezoneOffset() * 60000;
    return new Date(utcMs + 8 * 60 * 60000);
  };
  const nowManila = () => toManila(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({ name: '', distanceKm: '', co2SavedKg: '' } as { name: string; distanceKm: string; co2SavedKg: string });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
    fetchForecastMini();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    setError("");
    try {
      const [appsRes, bikesRes, lbRes, issuesRes, historyRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/applications`, { credentials: 'include' }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/bikes`, { credentials: 'include' }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/leaderboard?limit=5`, { credentials: 'include' }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/reported-issues`, { credentials: 'include' }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/rental-history`, { credentials: 'include' }),
      ]);
      
      const appsData = await appsRes.json();
      const bikesData = await bikesRes.json();
      const lbData = await lbRes.json();
      const issuesData = await issuesRes.json();
      const historyData = await historyRes.json();
      
      if (appsData.success && bikesData.success && lbData.success) {
        const applications = appsData.applications;
        const bikes = bikesData.bikes;
        const fetchedLb: LeaderboardEntry[] = lbData.entries || [];
        const issues = issuesData?.issues || [];
        const history = Array.isArray(historyData?.history) ? historyData.history : [];
        
        // Calculate stats
        const totalApplications = applications.length;
        const pendingApplications = applications.filter((app: any) => !app.bikeId).length;
        const assignedApplications = applications.filter((app: any) => app.bikeId).length;
        const totalBikes = bikes.length;
        const availableBikes = bikes.filter((bike: any) => bike.status === 'available').length;
        const rentedBikes = bikes.filter((bike: any) => bike.status === 'rented').length;
        
        setStats({
          totalApplications,
          pendingApplications,
          assignedApplications,
          totalBikes,
          availableBikes,
          rentedBikes,
        });
        
        // Get recent applications (last 5)
        setRecentApplications(applications.slice(0, 5));
        setApplications(applications);
        setRentalHistory(history);
        
        // Get currently rented bikes
        setRecentBikes(bikes.filter((b: any) => (b?.status || '').toLowerCase() === 'rented'));

        // Leaderboard entries
        setLeaderboard(Array.isArray(fetchedLb) ? fetchedLb : []);
        setReportedIssues(Array.isArray(issues) ? issues : []);
      } else {
        setError("Failed to fetch dashboard data");
      }
    } catch {
      setError("Failed to fetch dashboard data");
    }
    setLoading(false);
  }

  // Mini forecast fetcher (with demo fallback)
  async function fetchForecastMini() {
    const base = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
    try {
      const res = await fetch(`${base}/maintenance/forecast`, { credentials: 'include' });
      const json = await res.json();
      if (json?.success && Array.isArray(json.forecast) && json.forecast.length > 0) {
        setForecast(json.forecast.map((p: any) => ({ weekStart: p.weekStart, yhat_plus_sim: Number(p.yhat_plus_sim || 0) })));
        setNextMonthSummary(json.nextMonth || null);
        return;
      }
    } catch {}
    // demo fallback (simple upward weekly 12pts)
    const today = new Date();
    function weekStartMonday(dt: Date) {
      const d = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
      const dow = d.getUTCDay();
      const diff = (dow + 6) % 7;
      d.setUTCDate(d.getUTCDate() - diff);
      return d;
    }
    const baseW = weekStartMonday(today);
    const pts: { weekStart: string; yhat_plus_sim: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const wk = new Date(baseW); wk.setUTCDate(baseW.getUTCDate() + i * 7);
      pts.push({ weekStart: wk.toISOString().slice(0,10), yhat_plus_sim: Math.max(0, Math.round(2 + i * 0.6 + (Math.random() < 0.3 ? 1 : 0))) });
    }
    setForecast(pts);
    const firstNext = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));
    const firstAfter = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 2, 1));
    let sum = 0;
    pts.forEach(p => { if (p.weekStart >= firstNext.toISOString().slice(0,10) && p.weekStart < firstAfter.toISOString().slice(0,10)) sum += p.yhat_plus_sim; });
    setNextMonthSummary({ start: firstNext.toISOString().slice(0,10), end: firstAfter.toISOString().slice(0,10), sumPlusSim: sum });
  }

  const StatCard = ({ title, value, color, icon }: { title: string; value: number; color: string; icon: string }) => (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      border: `2px solid ${color}20`,
      flex: 1,
      minWidth: 200,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 14, color: '#6b7280', fontWeight: 600 }}>{title}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: color }}>{value}</div>
    </div>
  );

  // Minimal charts (SVG-based for zero dependencies)
  const BarChart = ({ data, labels, color = '#1976d2', height = 160 }: { data: number[]; labels: string[]; color?: string; height?: number }) => {
    const max = Math.max(1, ...data);
    const ticks = 4; // number of y-axis ticks
    const barWidth = 28;
    const gap = 16;
    const paddingLeft = 36; // space for y-axis labels
    const paddingBottom = 24; // space for x labels
    const paddingTop = 8;
    const chartHeight = height - paddingTop - paddingBottom;
    const width = paddingLeft + data.length * (barWidth + gap) + gap;
    return (
      <svg width={width} height={height} style={{ maxWidth: '100%' }} viewBox={`0 0 ${width} ${height}`}>
        {/* Y Axis and grid lines */}
        <line x1={paddingLeft - 6} y1={paddingTop} x2={paddingLeft - 6} y2={paddingTop + chartHeight} stroke="#e5e7eb" />
        {Array.from({ length: ticks + 1 }).map((_, i) => {
          const value = Math.round((max / ticks) * (ticks - i));
          const y = paddingTop + (chartHeight / ticks) * i;
          return (
            <g key={i}>
              <line x1={paddingLeft - 6} y1={y} x2={width} y2={y} stroke="#f1f5f9" />
              <text x={paddingLeft - 10} y={y + 4} textAnchor="end" fontSize={10} fill="#94a3b8">{value}</text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((v, i) => {
          const h = Math.round((v / max) * chartHeight);
          const x = paddingLeft + gap + i * (barWidth + gap);
          const y = paddingTop + (chartHeight - h);
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={h} rx={6} fill={color} opacity={0.9} />
              <text x={x + barWidth / 2} y={height - 6} textAnchor="middle" fontSize={11} fill="#6b7280">{labels[i]}</text>
            </g>
          );
        })}
      </svg>
    );
  };

  const PieChart = ({ values, colors, size = 140 }: { values: number[]; colors: string[]; size?: number }) => {
    const total = Math.max(1, values.reduce((a, b) => a + b, 0));
    const radius = size / 2 - 8;
    const cx = size / 2;
    const cy = size / 2;
    let startAngle = 0;
    const segments = values.map((v, i) => {
      const angle = (v / total) * Math.PI * 2;
      const x1 = cx + radius * Math.cos(startAngle);
      const y1 = cy + radius * Math.sin(startAngle);
      const x2 = cx + radius * Math.cos(startAngle + angle);
      const y2 = cy + radius * Math.sin(startAngle + angle);
      const largeArc = angle > Math.PI ? 1 : 0;
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      startAngle += angle;
      return <path key={i} d={path} fill={colors[i % colors.length]} />;
    });
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{segments}</svg>
    );
  };

  // Derived analytics
  const usage = useMemo(() => {
    // Use the most recent activity across applications and rental history
    const latestAppMs = applications.reduce((latest, a) => {
      const d = toManila(new Date(a?.createdAt));
      const t = d.getTime();
      return Number.isNaN(t) ? latest : Math.max(latest, t);
    }, 0);
    const latestRentMs = rentalHistory.reduce((latest, r) => {
      const raw = r?.startDate || r?.createdAt;
      const d = toManila(new Date(raw));
      const t = d.getTime();
      return Number.isNaN(t) ? latest : Math.max(latest, t);
    }, 0);
    const latestMs = Math.max(latestAppMs, latestRentMs);
    const now = latestMs ? new Date(latestMs) : nowManila();
    if (usageRange === 'week') {
      // Normalize to Manila midnight boundaries to avoid off-by-one around day changes
      const todayM = new Date(now);
      todayM.setHours(0,0,0,0);
      const start = new Date(todayM);
      start.setDate(todayM.getDate() - 6);
      const labels = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
      });
      const rentals = new Array(7).fill(0);
      const appsArr = new Array(7).fill(0);
      // applications timeline (submissions)
      applications.forEach((a) => {
        const d = toManila(new Date(a?.createdAt));
        const dm = new Date(d);
        dm.setHours(0,0,0,0);
        if (dm < start || dm > todayM) return;
        const idx = Math.max(0, Math.min(6, Math.floor((dm.getTime() - start.getTime()) / (24*60*60*1000))));
        appsArr[idx] += 1;
      });
      // rentals timeline (assignments/completions) from history
      rentalHistory.forEach((r) => {
        const raw = r?.startDate || r?.createdAt;
        const d = toManila(new Date(raw));
        const dm = new Date(d);
        dm.setHours(0,0,0,0);
        if (dm < start || dm > todayM) return;
        const idx = Math.max(0, Math.min(6, Math.floor((dm.getTime() - start.getTime()) / (24*60*60*1000))));
        rentals[idx] += 1;
      });
      return { labels, rentals, apps: appsArr };
    }
    if (usageRange === 'month') {
      // Calendar month (Manila): group by week-of-month into 4 buckets (W1..W4)
      const labels = ['W1','W2','W3','W4'];
      const rentals = new Array(4).fill(0);
      const appsArr = new Array(4).fill(0);
      const firstOfMonth = new Date(now);
      firstOfMonth.setHours(0,0,0,0);
      firstOfMonth.setDate(1);
      const end = new Date(now);
      end.setHours(0,0,0,0);
      applications.forEach((a) => {
        const d = toManila(new Date(a?.createdAt));
        const dm = new Date(d);
        dm.setHours(0,0,0,0);
        if (dm < firstOfMonth || dm > end) return; // only current month
        const dayOfMonth = dm.getDate();
        const idx = Math.max(0, Math.min(3, Math.floor((dayOfMonth - 1) / 7))); // W1..W4
        appsArr[idx] += 1;
      });
      rentalHistory.forEach((r) => {
        const raw = r?.startDate || r?.createdAt;
        const d = toManila(new Date(raw));
        const dm = new Date(d);
        dm.setHours(0,0,0,0);
        if (dm < firstOfMonth || dm > end) return;
        const dayOfMonth = dm.getDate();
        const idx = Math.max(0, Math.min(3, Math.floor((dayOfMonth - 1) / 7)));
        rentals[idx] += 1;
      });
      return { labels, rentals, apps: appsArr };
    }
    // year: last 12 calendar months up to current month, Manila time
    const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const labels: string[] = [];
    const rentals = new Array(12).fill(0);
    const appsArr = new Array(12).fill(0);
    // anchor to first day of current month (Manila midnight)
    const anchor = new Date(now);
    anchor.setHours(0,0,0,0);
    anchor.setDate(1);
    // start = 11 months before anchor
    const start = new Date(anchor);
    start.setMonth(anchor.getMonth() - 11);
    // build labels from start..anchor (12 months)
    for (let i = 0; i < 12; i++) {
      const m = (start.getMonth() + i + 12) % 12;
      labels.push(monthLabels[m]);
    }
    applications.forEach((a) => {
      const d = toManila(new Date(a?.createdAt));
      const dm = new Date(d);
      dm.setHours(0,0,0,0);
      dm.setDate(1);
      if (dm < start || dm > anchor) return;
      const monthsDiff = (dm.getFullYear() - start.getFullYear()) * 12 + (dm.getMonth() - start.getMonth());
      if (monthsDiff >= 0 && monthsDiff < 12) {
        appsArr[monthsDiff] += 1;
      }
    });
    rentalHistory.forEach((r) => {
      const raw = r?.startDate || r?.createdAt;
      const d = toManila(new Date(raw));
      const dm = new Date(d);
      dm.setHours(0,0,0,0);
      dm.setDate(1);
      if (dm < start || dm > anchor) return;
      const monthsDiff = (dm.getFullYear() - start.getFullYear()) * 12 + (dm.getMonth() - start.getMonth());
      if (monthsDiff >= 0 && monthsDiff < 12) {
        rentals[monthsDiff] += 1;
      }
    });
    return { labels, rentals, apps: appsArr };
  }, [applications, rentalHistory, usageRange]);

  const collegeAnalytics = useMemo(() => {
    const colleges = ['CTE', 'CET', 'CAS', 'CABE', 'CICS'];
    // Anchor to latest activity across applications and rentals
    const latestAppMs = applications.reduce((latest, a) => {
      const d = toManila(new Date(a?.createdAt));
      const t = d.getTime();
      return Number.isNaN(t) ? latest : Math.max(latest, t);
    }, 0);
    const latestRentMs = rentalHistory.reduce((latest, r) => {
      const raw = r?.startDate || r?.createdAt;
      const d = toManila(new Date(raw));
      const t = d.getTime();
      return Number.isNaN(t) ? latest : Math.max(latest, t);
    }, 0);
    const now = (latestAppMs || latestRentMs) ? new Date(Math.max(latestAppMs, latestRentMs)) : nowManila();

    // Build time window predicate
    let inWindow: (dm: Date) => boolean;
    if (collegeRange === 'week') {
      const todayM = new Date(now); todayM.setHours(0,0,0,0);
      const start = new Date(todayM); start.setDate(todayM.getDate() - 6);
      inWindow = (dm: Date) => dm >= start && dm <= todayM;
    } else if (collegeRange === 'month') {
      const firstOfMonth = new Date(now); firstOfMonth.setHours(0,0,0,0); firstOfMonth.setDate(1);
      const end = new Date(now); end.setHours(0,0,0,0);
      inWindow = (dm: Date) => dm >= firstOfMonth && dm <= end;
    } else {
      const anchor = new Date(now); anchor.setHours(0,0,0,0); anchor.setDate(1);
      const start = new Date(anchor); start.setMonth(anchor.getMonth() - 11);
      inWindow = (dm: Date) => { const d = new Date(dm); d.setHours(0,0,0,0); d.setDate(1); return d >= start && d <= anchor; };
    }

    // Filter data by window
    const filteredApplications = applications.filter((a) => {
      const d = toManila(new Date(a?.createdAt));
      const dm = new Date(d); dm.setHours(0,0,0,0);
      return inWindow(dm);
    });
    const filteredRentals = rentalHistory.filter((r) => {
      const raw = r?.startDate || r?.createdAt;
      const d = toManila(new Date(raw));
      const dm = new Date(d); dm.setHours(0,0,0,0);
      return inWindow(dm);
    });

    const rentalCounts = [0, 0, 0, 0, 0];
    const applicationCounts = [0, 0, 0, 0, 0];

    // Flexible college mapping
    const collegeMapping: Record<string, number> = {
      'CTE': 0, 'COLLEGE OF TEACHER EDUCATION': 0, 'TEACHER EDUCATION': 0,
      'CET': 1, 'COLLEGE OF ENGINEERING TECHNOLOGY': 1, 'ENGINEERING TECHNOLOGY': 1,
      'CAS': 2, 'COLLEGE OF ARTS AND SCIENCES': 2, 'ARTS AND SCIENCES': 2,
      'CABE': 3, 'COLLEGE OF ACCOUNTANCY BUSINESS AND ECONOMICS': 3, 'ACCOUNTANCY BUSINESS ECONOMICS': 3,
      'CICS': 4, 'COLLEGE OF INFORMATICS AND COMPUTING SCIENCES': 4, 'INFORMATICS COMPUTING SCIENCES': 4
    };

    const resolveIndex = (name: string): number => {
      const upper = (name || '').toUpperCase().trim();
      let idx = colleges.indexOf(upper);
      if (idx === -1) {
        for (const [key, i] of Object.entries(collegeMapping)) {
          if (upper.includes(key) || key.includes(upper)) { idx = i; break; }
        }
      }
      return idx;
    };

    filteredApplications.forEach((a) => {
      const idx = resolveIndex((a.college || a.department || '') as string);
      if (idx >= 0) applicationCounts[idx] += 1;
    });

    filteredRentals.forEach((r) => {
      const idx = resolveIndex((r.college || '') as string);
      if (idx >= 0) rentalCounts[idx] += 1;
    });

    return { colleges, rentalCounts, applicationCounts };
  }, [applications, rentalHistory, collegeRange]);

  const maintenanceAnalytics = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    reportedIssues.forEach((i) => {
      const t = (i.type || 'Other');
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    });
    const labels = Object.keys(typeCounts).slice(0, 6);
    const values = labels.map((l) => typeCounts[l]);
    return { labels, values };
  }, [reportedIssues]);

  const sustainability = useMemo(() => {
    const totalDistance = leaderboard.reduce((s, e) => s + (e.distanceKm || 0), 0);
    const totalCO2 = leaderboard.reduce((s, e) => s + (e.co2SavedKg || 0), 0);
    // Rough calories estimate: 30 kcal per km (casual pace)
    const totalCalories = Math.round(totalDistance * 30);
    return { totalDistance, totalCO2, totalCalories };
  }, [leaderboard]);

  const QuickActionCard = ({ title, description, href, color }: { title: string; description: string; href: string; color: string }) => (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        background: '#fff',
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: `2px solid ${color}20`,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }} onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)';
      }} onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
      }}>
        <div>
          <h3 style={{ color: color, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>{title}</h3>
          <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.5 }}>{description}</p>
        </div>
        <div style={{ color: color, fontSize: 20, marginTop: 16 }}>→</div>
      </div>
    </Link>
  );

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f8fa' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <BikeLoader />
          <h2 style={{ color: '#1976d2', margin: 0 }}>Loading dashboard...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '48px 24px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ color: '#1976d2', fontWeight: 800, fontSize: 36, marginBottom: 8, textAlign: 'center' }}>
            Admin Dashboard
          </h1>
          <p style={{ color: '#6b7280', fontSize: 16, textAlign: 'center', margin: 0 }}>
            Manage bike rentals and applications
          </p>
        </div>

        {error && (
          <div style={{ 
            background: '#fef2f2', 
            border: '1px solid #fecaca', 
            color: '#dc2626', 
            padding: 16, 
            borderRadius: 8, 
            marginBottom: 24,
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div style={{ display: 'flex', gap: 20, marginBottom: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            <StatCard 
              title="Total Applications" 
              value={stats.totalApplications} 
              color="#1976d2" 
              icon="📋"
            />
            <StatCard 
              title="Pending Applications" 
              value={stats.pendingApplications} 
              color="#f59e0b" 
              icon="⏳"
            />
            <StatCard 
              title="Assigned Applications" 
              value={stats.assignedApplications} 
              color="#22c55e" 
              icon="✅"
            />
            <StatCard 
              title="Total Bikes" 
              value={stats.totalBikes} 
              color="#8b5cf6" 
              icon="🚲"
            />
            <StatCard 
              title="Available Bikes" 
              value={stats.availableBikes} 
              color="#06b6d4" 
              icon="🟢"
            />
            <StatCard 
              title="Rented Bikes" 
              value={stats.rentedBikes} 
              color="#ef4444" 
              icon="🔴"
            />
          </div>
        )}

        {/* Usage Insights */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ color: '#111827', fontWeight: 800, fontSize: 20, margin: 0 }}>Usage Insights</h3>
            <div style={{ display: 'flex', gap: 8, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: 4 }}>
              {(['week','month','year'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setUsageRange(r)}
                  style={{
                    border: 'none',
                    borderRadius: 8,
                    background: usageRange === r ? '#ffffff' : 'transparent',
                    padding: '6px 10px',
                    fontWeight: 700,
                    color: usageRange === r ? '#111827' : '#6b7280',
                    cursor: 'pointer',
                  }}
                >
                  {r === 'week' ? 'Week' : r === 'month' ? 'Month' : 'Year'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ color: '#6b7280', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Rentals Over Time</div>
              <BarChart data={usage.rentals} labels={usage.labels} color="#1976d2" />
            </div>
            <div>
              <div style={{ color: '#6b7280', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Applications Over Time</div>
              <BarChart data={usage.apps} labels={usage.labels} color="#22c55e" />
            </div>
          </div>
        </div>

        {/* College Analytics */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ color: '#111827', fontWeight: 800, fontSize: 20, margin: 0 }}>College Analytics</h3>
            <div style={{ display: 'flex', gap: 8, background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 10, padding: 4 }}>
              {(['week','month','year'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setCollegeRange(r)}
                  style={{
                    border: 'none',
                    borderRadius: 8,
                    background: collegeRange === r ? '#ffffff' : 'transparent',
                    padding: '6px 10px',
                    fontWeight: 700,
                    color: collegeRange === r ? '#111827' : '#6b7280',
                    cursor: 'pointer',
                  }}
                >
                  {r === 'week' ? 'Week' : r === 'month' ? 'Month' : 'Year'}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ color: '#6b7280', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Bikes Rented by College</div>
              <BarChart data={collegeAnalytics.rentalCounts} labels={collegeAnalytics.colleges} color="#8b5cf6" />
            </div>
            <div>
              <div style={{ color: '#6b7280', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Applications Submitted by College</div>
              <BarChart data={collegeAnalytics.applicationCounts} labels={collegeAnalytics.colleges} color="#06b6d4" />
            </div>
          </div>
        </div>

        {/* Maintenance Analytics */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ color: '#111827', fontWeight: 800, fontSize: 20, margin: 0 }}>Operational & Maintenance Analytics</h3>
          </div>
          {/* Clickable projected maintenance demand mini-card */}
          <Link href="/admin/maintenance" style={{ textDecoration: 'none' }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 16, cursor: 'pointer', background: '#ffffff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div style={{ color: '#111827', fontWeight: 700 }}>Projected maintenance demand (weekly)</div>
                {nextMonthSummary && (
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Next month: <span style={{ color: '#111827', fontWeight: 700 }}>{Math.round(nextMonthSummary.sumPlusSim ?? nextMonthSummary.sumMean ?? 0)}</span></div>
                )}
              </div>
              <div style={{ marginTop: 8, overflowX: 'auto' }}>
                {forecast.length > 0 ? (
                  (() => {
                    const h = 120; const pad = 24; const w = Math.max(300, forecast.length * 40);
                    const xs = forecast.map((_, i) => pad + (i * (w - pad * 2)) / Math.max(1, forecast.length - 1));
                    const ys = forecast.map(p => p.yhat_plus_sim);
                    const maxY = Math.max(1, Math.max(...ys));
                    const yToPix = (v: number) => h - pad - (v / maxY) * (h - pad * 2);
                    const line = xs.map((x, i) => `${x},${yToPix(ys[i])}`).join(' ');
                    return (
                      <svg width={w} height={h} style={{ display: 'block' }}>
                        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#e5e7eb" />
                        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="#e5e7eb" />
                        <polyline points={line} fill="none" stroke="#1976d2" strokeWidth={2} />
                        {xs.map((x, i) => (<circle key={i} cx={x} cy={yToPix(ys[i])} r={3} fill="#1976d2" />))}
                      </svg>
                    );
                  })()
                ) : (
                  <div style={{ color: '#6b7280', fontStyle: 'italic' }}>No forecast yet</div>
                )}
              </div>
            </div>
          </Link>
          {maintenanceAnalytics.values.length > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
              <PieChart values={maintenanceAnalytics.values} colors={["#1976d2","#22c55e","#f59e0b","#ef4444","#06b6d4","#8b5cf6"]} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {maintenanceAnalytics.labels.map((l, i) => (
                  <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#374151', fontSize: 14 }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: ["#1976d2","#22c55e","#f59e0b","#ef4444","#06b6d4","#8b5cf6"][i % 6] }} />
                    {l} — {maintenanceAnalytics.values[i]}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ color: '#6b7280' }}>No reported issues yet.</div>
          )}
        </div>

        {/* Sustainability Analytics */}
        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ color: '#111827', fontWeight: 800, fontSize: 20, margin: 0 }}>Sustainability Analytics</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
              <div style={{ color: '#6b7280', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Calories Burned</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#f59e0b' }}>{sustainability.totalCalories.toLocaleString()} kcal</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
              <div style={{ color: '#6b7280', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>CO₂ Saved</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#22c55e' }}>{sustainability.totalCO2.toLocaleString()} kg</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
              <div style={{ color: '#6b7280', fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Total Kilometers Biked</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#1976d2' }}>{sustainability.totalDistance.toLocaleString()} km</div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
          {/* Recent Applications */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ color: '#111827', fontWeight: 700, fontSize: 20, margin: 0 }}>Recent Applications</h3>
              <Link href="/admin/applications" style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}>
                View All →
              </Link>
            </div>
            {recentApplications.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recentApplications.map(app => (
                  <div key={app.id} style={{ 
                    padding: 12, 
                    border: '1px solid #e5e7eb', 
                    borderRadius: 8,
                    background: app.status === 'Assigned' ? '#f0f9ff' : '#fff'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#111827' }}>
                        {app.firstName} {app.lastName}
                      </span>
                      <span style={{ 
                        fontSize: 12, 
                        padding: '4px 8px', 
                        borderRadius: 12,
                        background: app.status === 'Assigned' ? '#dcfce7' : '#fef3c7',
                        color: app.status === 'Assigned' ? '#166534' : '#92400e',
                        fontWeight: 600
                      }}>
                        {app.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: '#6b7280' }}>{app.email}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                      Applied: {new Date(app.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6b7280', textAlign: 'center', fontStyle: 'italic' }}>No applications yet</p>
            )}
          </div>

          {/* Rented Bikes */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ color: '#111827', fontWeight: 700, fontSize: 20, margin: 0 }}>Rented Bikes</h3>
              <Link href="/admin/bikes?status=rented" style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}>
                View All →
              </Link>
            </div>
            {recentBikes.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recentBikes.map(bike => (
                  <div key={bike.id} style={{ 
                    padding: 12, 
                    border: '1px solid #e5e7eb', 
                    borderRadius: 8,
                    background: bike.status === 'available' ? '#f0f9ff' : '#fef2f2'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, color: '#111827' }}>{bike.name}</span>
                      <span style={{ 
                        fontSize: 12, 
                        padding: '4px 8px', 
                        borderRadius: 12,
                        background: bike.status === 'available' ? '#dcfce7' : '#fecaca',
                        color: bike.status === 'available' ? '#166534' : '#dc2626',
                        fontWeight: 600
                      }}>
                        {bike.status === 'available' ? 'Available' : 'Rented'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      Added: {new Date(bike.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#6b7280', textAlign: 'center', fontStyle: 'italic' }}>No rented bikes at the moment</p>
            )}
          </div>

          {/* Leaderboard */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ color: '#111827', fontWeight: 700, fontSize: 20, margin: 0 }}>Leaderboard</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowAddForm(v => !v)}
                  style={{ background: '#1976d2', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  {showAddForm ? 'Cancel' : 'Add Entry'}
                </button>
                <button
                  onClick={() => fetchDashboardData()}
                  style={{ background: '#e5e7eb', color: '#111827', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Refresh
                </button>
              </div>
            </div>
            {showAddForm && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const payload = {
                    name: newEntry.name.trim(),
                    distanceKm: parseFloat(newEntry.distanceKm),
                    co2SavedKg: parseFloat(newEntry.co2SavedKg),
                  };
                  if (!payload.name || Number.isNaN(payload.distanceKm) || Number.isNaN(payload.co2SavedKg)) {
                    alert('Please provide valid name, distance, and CO2 values.');
                    return;
                  }
                  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/leaderboard`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload),
                  });
                  const data = await res.json();
                  if (data.success) {
                    setNewEntry({ name: '', distanceKm: '', co2SavedKg: '' });
                    setShowAddForm(false);
                    fetchDashboardData();
                  } else {
                    alert(data.error || 'Failed to add entry');
                  }
                }}
                style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 16 }}
              >
                <input placeholder="Name" value={newEntry.name} onChange={(e) => setNewEntry({ ...newEntry, name: e.target.value })} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }} />
                <input placeholder="Distance (km)" value={newEntry.distanceKm} onChange={(e) => setNewEntry({ ...newEntry, distanceKm: e.target.value })} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }} />
                <input placeholder="CO₂ Saved (kg)" value={newEntry.co2SavedKg} onChange={(e) => setNewEntry({ ...newEntry, co2SavedKg: e.target.value })} style={{ padding: 8, border: '1px solid #e5e7eb', borderRadius: 8 }} />
                <button type="submit" style={{ background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, cursor: 'pointer' }}>Save</button>
              </form>
            )}
            {leaderboard.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: 10, textAlign: 'left', fontWeight: 800, color: '#374151' }}>Rank</th>
                    <th style={{ padding: 10, textAlign: 'left', fontWeight: 800, color: '#374151' }}>Name</th>
                    <th style={{ padding: 10, textAlign: 'right', fontWeight: 800, color: '#374151' }}>Distance (km)</th>
                    <th style={{ padding: 10, textAlign: 'right', fontWeight: 800, color: '#374151' }}>CO₂ Saved (kg)</th>
                    <th style={{ padding: 10, textAlign: 'right', fontWeight: 800, color: '#374151' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((entry, idx) => (
                    <tr key={entry.id} style={{ background: idx === 0 ? '#ecfdf5' : 'transparent' }}>
                      <td style={{ padding: 10, color: '#111827', fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ padding: 10, fontWeight: idx === 0 ? 800 : 600, color: '#111827' }}>{entry.name}</td>
                      <td style={{ padding: 10, textAlign: 'right', color: '#111827' }}>{entry.distanceKm}</td>
                      <td style={{ padding: 10, textAlign: 'right', color: '#6b7280' }}>{entry.co2SavedKg}</td>
                      <td style={{ padding: 10, textAlign: 'right' }}>
                        <button
                          onClick={async () => {
                            const name = prompt('Name', entry.name) || entry.name;
                            const distance = prompt('Distance (km)', String(entry.distanceKm));
                            const co2 = prompt('CO₂ Saved (kg)', String(entry.co2SavedKg));
                            const distanceKm = distance == null ? entry.distanceKm : parseFloat(distance);
                            const co2SavedKg = co2 == null ? entry.co2SavedKg : parseFloat(co2);
                            if (Number.isNaN(distanceKm) || Number.isNaN(co2SavedKg)) return alert('Invalid numbers');
                            const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/leaderboard`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              credentials: 'include',
                              body: JSON.stringify({ id: entry.id, name, distanceKm, co2SavedKg }),
                            });
                            const data = await res.json();
                            if (data.success) fetchDashboardData();
                            else alert(data.error || 'Failed to update');
                          }}
                          style={{ background: '#e5e7eb', color: '#111827', border: '1px solid #d1d5db', borderRadius: 8, padding: '6px 10px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: '#6b7280', textAlign: 'center', fontStyle: 'italic' }}>No entries yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 