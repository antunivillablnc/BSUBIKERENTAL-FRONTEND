"use client";
import { useEffect, useState, useRef } from "react";

// Extend Window interface to include Chart
declare global {
  interface Window {
    Chart?: any;
    myTrendsChart?: any;
  }
}

// Import Chart.js via CDN for simplicity (in real app, use a package)
const ChartJSLoaded = typeof window !== 'undefined' && window.Chart;

function loadChartJsScript() {
  if (typeof window !== 'undefined' && !window.Chart) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.async = true;
    document.body.appendChild(script);
  }
}

// Simple sparkline component
function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / (max - min || 1)) * 100}`).join(' ');
  return (
    <svg width="100%" height="32" viewBox="0 0 100 100" style={{ display: 'block' }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="4"
        points={points}
      />
    </svg>
  );
}

// Simple progress bar
function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const percent = Math.min(100, Math.round((value / max) * 100));
  return (
    <div style={{ width: '100%', background: 'var(--border-color)', borderRadius: 8, height: 10, marginTop: 8 }}>
      <div style={{ width: `${percent}%`, background: color, height: '100%', borderRadius: 8, transition: 'width 0.5s' }} />
    </div>
  );
}

export default function DashboardPage() {
  // Simulated real-time data (replace with real API calls)
  const [bikeLocation, setBikeLocation] = useState('Batangas State University Lipa Campus');
  const [travelDistanceKm, setTravelDistanceKm] = useState(42.5);
  const [costSavings, setCostSavings] = useState(340);
  const [co2SavingsKg, setCo2SavingsKg] = useState(9.2);
  const [distanceTrend, setDistanceTrend] = useState([5, 8, 12, 18, 22, 30, 42.5]);
  const [co2Trend, setCo2Trend] = useState([1, 2, 3, 4.5, 6, 7.5, 9.2]);
  // Time frame selection for trends
  const [timeFrame, setTimeFrame] = useState<'week' | 'month' | 'year'>('week');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  // Progress goals (editable & persisted)
  const [distanceGoal, setDistanceGoal] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('distanceGoal');
      const parsed = saved ? parseFloat(saved) : NaN;
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
    return 100;
  });
  const [co2Goal, setCo2Goal] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('co2Goal');
      const parsed = saved ? parseFloat(saved) : NaN;
      if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    }
    return 20;
  });
  const [chartLoaded, setChartLoaded] = useState(ChartJSLoaded);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Listen for theme changes and update chart colors
  useEffect(() => {
    const updateChartTheme = () => {
      if (window.myTrendsChart) {
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#f8fafc' : '#111827';
        const gridColor = isDark ? '#475569' : '#e5e7eb';

        // Update chart options for dark mode
        if (window.myTrendsChart.options.scales?.x) {
          window.myTrendsChart.options.scales.x.grid = { ...(window.myTrendsChart.options.scales.x.grid || {}), color: gridColor };
          window.myTrendsChart.options.scales.x.ticks = { ...(window.myTrendsChart.options.scales.x.ticks || {}), color: textColor };
          window.myTrendsChart.options.scales.x.title = { ...(window.myTrendsChart.options.scales.x.title || {}), color: textColor };
        }
        if (window.myTrendsChart.options.scales?.y) {
          window.myTrendsChart.options.scales.y.grid = { ...(window.myTrendsChart.options.scales.y.grid || {}), color: gridColor };
          window.myTrendsChart.options.scales.y.ticks = { ...(window.myTrendsChart.options.scales.y.ticks || {}), color: textColor };
          window.myTrendsChart.options.scales.y.title = { ...(window.myTrendsChart.options.scales.y.title || {}), color: textColor };
        }
        if (window.myTrendsChart.options.scales?.y1) {
          window.myTrendsChart.options.scales.y1.grid = { ...(window.myTrendsChart.options.scales.y1.grid || {}), color: gridColor };
          window.myTrendsChart.options.scales.y1.ticks = { ...(window.myTrendsChart.options.scales.y1.ticks || {}), color: textColor };
          window.myTrendsChart.options.scales.y1.title = { ...(window.myTrendsChart.options.scales.y1.title || {}), color: textColor };
        }

        window.myTrendsChart.options.plugins.legend = {
          ...(window.myTrendsChart.options.plugins.legend || {}),
          labels: { ...((window.myTrendsChart.options.plugins.legend || {}).labels || {}), color: textColor },
        };
        window.myTrendsChart.options.plugins.title = {
          ...(window.myTrendsChart.options.plugins.title || {}),
          color: textColor,
        } as any;
        window.myTrendsChart.options.plugins.tooltip = {
          ...((window.myTrendsChart.options.plugins || {}).tooltip || {}),
          titleColor: textColor,
          bodyColor: textColor,
          backgroundColor: isDark ? '#0f172a' : '#ffffff',
        } as any;

        window.myTrendsChart.update();
      }
    };

    // Initial update
    updateChartTheme();
    
    // Listen for theme changes
    const observer = new MutationObserver(updateChartTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  // Persist goals when changed
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('distanceGoal', String(distanceGoal));
  }, [distanceGoal]);
  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('co2Goal', String(co2Goal));
  }, [co2Goal]);

  function editDistanceGoal() {
    const input = prompt('Set travel distance goal (km):', String(distanceGoal));
    if (input == null) return;
    const val = parseFloat(input);
    if (!Number.isNaN(val) && val > 0) setDistanceGoal(val);
    else alert('Please enter a valid positive number.');
  }
  function editCo2Goal() {
    const input = prompt('Set CO₂ savings goal (kg):', String(co2Goal));
    if (input == null) return;
    const val = parseFloat(input);
    if (!Number.isNaN(val) && val > 0) setCo2Goal(val);
    else alert('Please enter a valid positive number.');
  }

  // Real leaderboard from API
  type LeaderboardEntry = { id: string; name: string; distanceKm: number; co2SavedKg: number; userId?: string | null };
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id?: string; name?: string; email?: string } | null>(null);

  useEffect(() => {
    // Load current user from localStorage
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (stored) setCurrentUser(JSON.parse(stored));
    } catch {}
  }, []);

  async function fetchLeaderboard() {
    try {
      const res = await fetch('/api/leaderboard?limit=10');
      const data = await res.json();
      if (data.success && Array.isArray(data.entries)) {
        setLeaderboardEntries(data.entries);
      }
    } catch {}
  }

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  // Mock personal bests
  const personalBests = {
    longestRide: 18.2, // km
    mostInWeek: 32, // km
    mostInMonth: 42.5, // km
  };

  // Fun environmental equivalence
  const treesPlanted = Math.round(co2SavingsKg / 21); // 21kg CO2 = 1 tree/year
  const carKmAvoided = Math.round(co2SavingsKg * 7.7); // 1kg CO2 ~ 7.7km by car

  // Simulate polling for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate new data (replace with real API fetch)
      setTravelDistanceKm(d => Math.round((d + Math.random() * 2) * 10) / 10);
      setCostSavings(c => Math.round((c + Math.random() * 10)));
      setCo2SavingsKg(c => Math.round((c + Math.random() * 0.5) * 10) / 10);
      setDistanceTrend(trend => [...trend.slice(1), travelDistanceKm + Math.random() * 2]);
      setCo2Trend(trend => [...trend.slice(1), co2SavingsKg + Math.random() * 0.5]);
      setLastUpdated(new Date());
    }, 10000); // 10 seconds
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [travelDistanceKm, co2SavingsKg]);

  // Load Chart.js if not loaded
  useEffect(() => {
    if (!chartLoaded) {
      loadChartJsScript();
      const check = setInterval(() => {
        if (window.Chart) {
          setChartLoaded(true);
          clearInterval(check);
        }
      }, 200);
      return () => clearInterval(check);
    }
  }, [chartLoaded]);

  // Determine labels and base trend data by selected time frame
  function getTrendBase(frame: 'week' | 'month' | 'year') {
    if (frame === 'month') {
      return {
        labels: ['W1', 'W2', 'W3', 'W4'],
        distance: [18, 26, 33, 42],
        co2: [3.2, 4.8, 7.1, 9.2],
      };
    }
    if (frame === 'year') {
      return {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        distance: [10, 18, 22, 28, 34, 40, 42, 38, 30, 26, 20, 16],
        co2: [2, 3, 3.6, 5, 6.5, 8, 9.2, 8.5, 7, 5.5, 4, 3],
      };
    }
    // week (default)
    return {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      distance: [5, 8, 12, 18, 22, 30, 42.5],
      co2: [1, 2, 3, 4.5, 6, 7.5, 9.2],
    };
  }

  // Update trends when time frame changes
  useEffect(() => {
    const base = getTrendBase(timeFrame);
    setDistanceTrend(base.distance);
    setCo2Trend(base.co2);
  }, [timeFrame]);

  // Render trends chart
  useEffect(() => {
    if (chartLoaded && chartRef.current && window.Chart) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        if (window.myTrendsChart) window.myTrendsChart.destroy();
        const base = getTrendBase(timeFrame);
        const isDark = document.documentElement.classList.contains('dark');
        const textColor = isDark ? '#f8fafc' : '#111827';
        const gridColor = isDark ? '#475569' : '#e5e7eb';
        window.myTrendsChart = new window.Chart(ctx, {
          type: 'line',
          data: {
            labels: base.labels,
            datasets: [
              {
                label: 'Distance (km)',
                data: distanceTrend,
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34,197,94,0.08)',
                tension: 0.4,
                yAxisID: 'y',
              },
              {
                label: 'CO₂ Saved (kg)',
                data: co2Trend,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139,92,246,0.08)',
                tension: 0.4,
                yAxisID: 'y1',
              },
              {
                label: 'Cost Savings (₱)',
                data: distanceTrend.map(d => Math.round(d * 8)),
                borderColor: '#f59e42',
                backgroundColor: 'rgba(251,191,36,0.08)',
                tension: 0.4,
                yAxisID: 'y2',
              },
            ],
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: true, position: 'top', labels: { color: textColor } },
              title: { display: true, text: `${timeFrame.charAt(0).toUpperCase()}${timeFrame.slice(1)} Trends`, color: textColor },
              tooltip: { titleColor: textColor, bodyColor: textColor, backgroundColor: isDark ? '#0f172a' : '#ffffff' },
            },
            scales: {
              x: { grid: { color: gridColor }, ticks: { color: textColor }, title: { display: false, color: textColor } },
              y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Distance (km)', color: textColor }, ticks: { color: textColor }, grid: { color: gridColor } },
              y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false, color: gridColor }, title: { display: true, text: 'CO₂ (kg)', color: textColor }, ticks: { color: textColor } },
              y2: { type: 'linear', display: false, position: 'right', ticks: { color: textColor }, grid: { color: gridColor } },
            },
          },
        });
      }
    }
  }, [chartLoaded, distanceTrend, co2Trend, timeFrame]);

  return (
    <div style={{
      minHeight: '100vh',
      background: `url('/car-rental-app.jpg') center center / cover no-repeat fixed`,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(80,80,80,0.7)', zIndex: 0, pointerEvents: 'none' }} />
      <div style={{ flex: 1, position: 'relative', zIndex: 1, padding: '48px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ 
            background: 'var(--card-bg)', 
            backdropFilter: 'blur(8px)', 
            border: '1px solid var(--border-color)', 
            borderRadius: 16, 
            boxShadow: '0 10px 30px var(--shadow-color)', 
            padding: 32 
          }}>
          <h1 style={{ color: 'var(--text-primary)', fontWeight: 900, letterSpacing: 0.3, fontSize: 34, marginBottom: 20, textAlign: 'center' }}>
            Dashboard
          </h1>
          {mounted && (
            <div style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: 13, marginBottom: 10 }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          {/* Trends Chart */}
          <div style={{ margin: '0 auto 32px', maxWidth: 880, background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 20, boxShadow: '0 8px 24px var(--shadow-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: 20, margin: 0, letterSpacing: 0.2 }}>{`${timeFrame.charAt(0).toUpperCase()}${timeFrame.slice(1)} Trends`}</h2>
              <div style={{ display: 'inline-flex', gap: 6, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: 9999, padding: 6 }}>
                {(['week','month','year'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeFrame(tf)}
                    style={{
                      background: timeFrame === tf ? 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)' : 'var(--bg-primary)',
                      color: timeFrame === tf ? '#ffffff' : 'var(--text-primary)',
                      border: timeFrame === tf ? '1px solid transparent' : '1px solid var(--border-color)',
                      borderRadius: 9999,
                      padding: '6px 10px',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: timeFrame === tf ? '0 0 0 2px rgba(37,99,235,0.25)' : 'none',
                      transition: 'background 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={(e) => { if (timeFrame !== tf) { e.currentTarget.style.background = 'var(--bg-tertiary)'; } }}
                    onMouseLeave={(e) => { if (timeFrame !== tf) { e.currentTarget.style.background = 'var(--bg-primary)'; } }}
                    aria-pressed={timeFrame === tf}
                  >
                    {tf === 'week' ? 'Week' : tf === 'month' ? 'Month' : 'Year'}
                  </button>
                ))}
              </div>
            </div>
            <canvas ref={chartRef} width={820} height={300} style={{ width: '100%', maxWidth: 820, background: 'var(--input-bg)', borderRadius: 12 }} />
            {!chartLoaded && <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>Loading chart...</div>}
          </div>
          {/* Dashboard Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 28,
            marginTop: 12,
            marginBottom: 24,
          }}>
            {/* Combined Bike Location + Travel Distance Card */}
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 8px 24px var(--shadow-color)',
              transition: 'transform 0.3s, box-shadow 0.3s',
              willChange: 'transform',
              border: '1px solid var(--border-color)',
            }}
              className="dashboard-card"
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
                {/* Left: Bike Location */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>📍</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 18, marginBottom: 6, letterSpacing: 0.2 }}>Bike Location</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: 16 }}>{bikeLocation}</div>
            </div>
                {/* Right: Travel Distance */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>🚴‍♂️</div>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 18, marginBottom: 6, letterSpacing: 0.2 }}>Travel Distance</div>
                  <div style={{ color: '#16a34a', fontSize: 20, marginBottom: 8, fontWeight: 800 }}>{travelDistanceKm} km</div>
                  <div style={{ margin: '0 auto', maxWidth: 280 }}>
              <Sparkline data={distanceTrend} color="#22c55e" />
                    <ProgressBar value={travelDistanceKm} max={distanceGoal} color="#22c55e" />
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
                      <span>Goal: {distanceGoal} km</span>
                      <button onClick={editDistanceGoal} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 9999, padding: '2px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Edit</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Cost Savings Card */}
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 8px 24px var(--shadow-color)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              minHeight: 220,
              transition: 'transform 0.3s, box-shadow 0.3s',
              willChange: 'transform',
              border: '1px solid var(--border-color)',
            }}
              className="dashboard-card"
            >
              <div style={{ fontSize: 46, marginBottom: 12 }}>💸</div>
              <div style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: 26, marginBottom: 8, letterSpacing: 0.2 }}>Cost Savings</div>
              <div style={{ color: 'var(--text-primary)', fontSize: 34, fontWeight: 900 }}>₱{costSavings.toLocaleString()}</div>
              {/* TODO: Replace with real cost savings calculation */}
            </div>
            {/* CO₂ Emission Savings Card */}
            <div style={{
              background: 'var(--card-bg)',
              borderRadius: 16,
              padding: 24,
              boxShadow: '0 8px 24px var(--shadow-color)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'transform 0.3s, box-shadow 0.3s',
              willChange: 'transform',
              border: '1px solid var(--border-color)',
            }}
              className="dashboard-card"
            >
              <div style={{ fontSize: 36, marginBottom: 10 }}>🌱</div>
              <div style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: 18, marginBottom: 6, letterSpacing: 0.2 }}>CO₂ Emission Savings</div>
              <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 800 }}>{co2SavingsKg} kg</div>
              <Sparkline data={co2Trend} color="#8b5cf6" />
              <ProgressBar value={co2SavingsKg} max={co2Goal} color="#8b5cf6" />
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, display: 'flex', justifyContent: 'center', gap: 8, alignItems: 'center' }}>
                <span>Goal: {co2Goal} kg</span>
                <button onClick={editCo2Goal} style={{ background: 'none', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 9999, padding: '2px 8px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Edit</button>
              </div>
              {/* TODO: Replace with real CO2 savings calculation */}
            </div>
          </div>
          {/* Personal Bests & Fun Facts */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginTop: 24, marginBottom: 24, justifyContent: 'center' }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24, minWidth: 220, flex: 1, boxShadow: '0 8px 24px var(--shadow-color)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: 20, marginBottom: 10, letterSpacing: 0.2 }}>Personal Bests</h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 4 }}>🚴‍♂️ Longest Ride: <b>{personalBests.longestRide} km</b></div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 4 }}>📅 Most in a Week: <b>{personalBests.mostInWeek} km</b></div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 16 }}>📆 Most in a Month: <b>{personalBests.mostInMonth} km</b></div>
            </div>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24, minWidth: 220, flex: 1, boxShadow: '0 8px 24px var(--shadow-color)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: 20, marginBottom: 10, letterSpacing: 0.2 }}>Environmental Impact</h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: 16, marginBottom: 4 }}>🌳 Trees Planted Equivalent: <b>{treesPlanted}</b></div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 16 }}>🚗 Car km Avoided: <b>{carKmAvoided} km</b></div>
            </div>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24, minWidth: 220, flex: 1, boxShadow: '0 8px 24px var(--shadow-color)' }}>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: 20, marginBottom: 10, letterSpacing: 0.2 }}>Goal Tracker</h3>
              <div style={{ color: 'var(--text-secondary)', fontSize: 16 }}>Distance Goal: <b>{Math.round((travelDistanceKm/distanceGoal)*100)}%</b> complete</div>
              <ProgressBar value={travelDistanceKm} max={distanceGoal} color="#22c55e" />
              <div style={{ color: 'var(--text-secondary)', fontSize: 16, marginTop: 10 }}>CO₂ Goal: <b>{Math.round((co2SavingsKg/co2Goal)*100)}%</b> complete</div>
              <ProgressBar value={co2SavingsKg} max={co2Goal} color="#8b5cf6" />
            </div>
          </div>
          {/* Leaderboard */}
          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 16, padding: 24, maxWidth: 700, margin: '0 auto', boxShadow: '0 8px 24px var(--shadow-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ color: 'var(--text-primary)', fontWeight: 900, fontSize: 20, letterSpacing: 0.2 }}>Leaderboard</h3>
              <button onClick={fetchLeaderboard} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: 8, padding: '6px 10px', fontWeight: 700, cursor: 'pointer' }}>Refresh</button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th style={{ padding: 8, textAlign: 'left', fontWeight: 800, color: 'var(--text-primary)', fontSize: 16 }}>Rank</th>
                  <th style={{ padding: 8, textAlign: 'left', fontWeight: 800, color: 'var(--text-primary)', fontSize: 16 }}>User</th>
                  <th style={{ padding: 8, textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)', fontSize: 16 }}>Distance (km)</th>
                  <th style={{ padding: 8, textAlign: 'right', fontWeight: 800, color: 'var(--text-primary)', fontSize: 16 }}>CO₂ Saved (kg)</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardEntries.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: 10, textAlign: 'center', color: 'var(--text-muted)' }}>No entries yet</td></tr>
                ) : (
                  leaderboardEntries.map((entry: LeaderboardEntry, i: number) => {
                    const isYou = !!(currentUser && (entry.userId === currentUser.id || (entry.name || '').toLowerCase() === (currentUser.name || '').toLowerCase() || (entry.name || '').toLowerCase() === (currentUser.email || '').toLowerCase()));
                    return (
                      <tr key={entry.id} style={{ background: isYou ? 'var(--bg-tertiary)' : 'transparent', fontWeight: isYou ? 800 : 500, color: 'var(--text-secondary)' }}>
                        <td style={{ padding: 8 }}>{i + 1}</td>
                        <td style={{ padding: 8 }}>{isYou ? 'You' : entry.name}</td>
                        <td style={{ padding: 8, textAlign: 'right' }}>{entry.distanceKm}</td>
                        <td style={{ padding: 8, textAlign: 'right' }}>{entry.co2SavedKg}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      </div>
      {/* Card hover animation */}
      <style>{`
        .dashboard-card {
          transition: transform 0.3s, box-shadow 0.3s;
        }
        .dashboard-card:hover {
          transform: translateY(-8px) scale(1.03);
          box-shadow: 0 8px 32px var(--shadow-color), 0 2px 8px rgba(0,0,0,0.10);
        }
      `}</style>
    </div>
  );
} 