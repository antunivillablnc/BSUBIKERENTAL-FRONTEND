"use client";
import { useEffect, useState, useRef } from "react";
import styles from "./dashboard.module.css";

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
    <svg width="100%" height="32" viewBox="0 0 100 100" className={styles.sparklineSvg}>
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
    <div className={styles.progress}>
      <div className={styles.progressFill} style={{ width: `${percent}%`, background: color }} />
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
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/leaderboard?limit=10`);
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
    <div className={styles.page}>
      <div className={styles.overlay} />
      <div className={styles.contentWrap}>
      <div className={styles.container}>
          <div className={styles.cardShell}>
          <h1 className={styles.h1Title}>
            Dashboard
          </h1>
          {mounted && (
            <div className={styles.lastUpdated}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          {/* Trends Chart */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <h2 className={styles.h2Title}>{`${timeFrame.charAt(0).toUpperCase()}${timeFrame.slice(1)} Trends`}</h2>
              <div className={styles.segmented}>
                {(['week','month','year'] as const).map(tf => (
                  <button
                    key={tf}
                    onClick={() => setTimeFrame(tf)}
                    className={`${styles.segmentBtn} ${timeFrame === tf ? styles.segmentBtnActive : ''}`}
                    aria-pressed={timeFrame === tf}
                  >
                    {tf === 'week' ? 'Week' : tf === 'month' ? 'Month' : 'Year'}
                  </button>
                ))}
              </div>
            </div>
            <canvas ref={chartRef} width={820} height={300} className={styles.chartCanvas} />
            {!chartLoaded && <div className={styles.muted} style={{ textAlign: 'center', marginTop: 12 }}>Loading chart...</div>}
          </div>
          {/* Dashboard Cards */}
          <div className={styles.gridCards}>
            {/* Combined Bike Location + Travel Distance Card */}
            <div className={`${styles.card} ${styles.cardHover}`}>
              <div className={styles.twoCol}>
                {/* Left: Bike Location */}
                <div className={styles.center}>
                  <div className={styles.iconLg}>📍</div>
                  <div className={styles.primaryTitle} style={{ fontSize: 18, marginBottom: 6 }}>Bike Location</div>
                  <div className={styles.secondaryText} style={{ fontSize: 16 }}>{bikeLocation}</div>
                </div>
                {/* Right: Travel Distance */}
                <div className={styles.center}>
                  <div className={styles.iconLg}>🚴‍♂️</div>
                  <div className={styles.primaryTitle} style={{ fontSize: 18, marginBottom: 6 }}>Travel Distance</div>
                  <div className={`${styles.valueEmphasis} ${styles.green}`}>{travelDistanceKm} km</div>
                  <div className={styles.miniChartBox}>
                    <Sparkline data={distanceTrend} color="#22c55e" />
                    <ProgressBar value={travelDistanceKm} max={distanceGoal} color="#22c55e" />
                    <div className={styles.goalRow}>
                      <span>Goal: {distanceGoal} km</span>
                      <button onClick={editDistanceGoal} className={styles.chipButton}>Edit</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Cost Savings Card */}
            <div className={`${styles.card} ${styles.cardHover} ${styles.minH220} ${styles.center}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className={styles.iconHuge}>💸</div>
              <div className={styles.primaryTitle} style={{ fontSize: 26, marginBottom: 8 }}>Cost Savings</div>
              <div className={styles.bigCurrency}>₱{costSavings.toLocaleString()}</div>
              {/* TODO: Replace with real cost savings calculation */}
            </div>
            {/* CO₂ Emission Savings Card */}
            <div className={`${styles.card} ${styles.cardHover} ${styles.center}`}>
              <div className={styles.iconLg}>🌱</div>
              <div className={styles.primaryTitle} style={{ fontSize: 18, marginBottom: 6 }}>CO₂ Emission Savings</div>
              <div className={styles.primaryTitle} style={{ fontSize: 18, fontWeight: 800 }}>{co2SavingsKg} kg</div>
              <Sparkline data={co2Trend} color="#8b5cf6" />
              <ProgressBar value={co2SavingsKg} max={co2Goal} color="#8b5cf6" />
              <div className={styles.goalRow}>
                <span>Goal: {co2Goal} kg</span>
                <button onClick={editCo2Goal} className={styles.chipButton}>Edit</button>
              </div>
              {/* TODO: Replace with real CO2 savings calculation */}
            </div>
          </div>
          {/* Personal Bests & Fun Facts */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginTop: 24, marginBottom: 24, justifyContent: 'center' }}>
            <div className={`${styles.card} ${styles.flexItem}`}>
              <h3 className={styles.h2Title} style={{ marginBottom: 10 }}>Personal Bests</h3>
              <div className={styles.secondaryText} style={{ fontSize: 16, marginBottom: 4 }}>🚴‍♂️ Longest Ride: <b>{personalBests.longestRide} km</b></div>
              <div className={styles.secondaryText} style={{ fontSize: 16, marginBottom: 4 }}>📅 Most in a Week: <b>{personalBests.mostInWeek} km</b></div>
              <div className={styles.secondaryText} style={{ fontSize: 16 }}>📆 Most in a Month: <b>{personalBests.mostInMonth} km</b></div>
            </div>
            <div className={`${styles.card} ${styles.flexItem}`}>
              <h3 className={styles.h2Title} style={{ marginBottom: 10 }}>Environmental Impact</h3>
              <div className={styles.secondaryText} style={{ fontSize: 16, marginBottom: 4 }}>🌳 Trees Planted Equivalent: <b>{treesPlanted}</b></div>
              <div className={styles.secondaryText} style={{ fontSize: 16 }}>🚗 Car km Avoided: <b>{carKmAvoided} km</b></div>
            </div>
            <div className={`${styles.card} ${styles.flexItem}`}>
              <h3 className={styles.h2Title} style={{ marginBottom: 10 }}>Goal Tracker</h3>
              <div className={styles.secondaryText} style={{ fontSize: 16 }}>Distance Goal: <b>{Math.round((travelDistanceKm/distanceGoal)*100)}%</b> complete</div>
              <ProgressBar value={travelDistanceKm} max={distanceGoal} color="#22c55e" />
              <div className={styles.secondaryText} style={{ fontSize: 16, marginTop: 10 }}>CO₂ Goal: <b>{Math.round((co2SavingsKg/co2Goal)*100)}%</b> complete</div>
              <ProgressBar value={co2SavingsKg} max={co2Goal} color="#8b5cf6" />
            </div>
          </div>
          {/* Leaderboard */}
          <div className={styles.tableCard}>
            <div className={styles.chartHeader}>
              <h3 className={styles.h2Title}>Leaderboard</h3>
              <button onClick={fetchLeaderboard} className={styles.btn}>Refresh</button>
            </div>
            <table className={styles.table}>
              <thead>
                <tr className={styles.theadRow}>
                  <th className={styles.th} style={{ textAlign: 'left', fontWeight: 800, color: 'var(--text-primary)', fontSize: 16 }}>Rank</th>
                  <th className={styles.th} style={{ textAlign: 'left', fontWeight: 800, color: 'var(--text-primary)', fontSize: 16 }}>User</th>
                  <th className={`${styles.th} ${styles.textRight}`} style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 16 }}>Distance (km)</th>
                  <th className={`${styles.th} ${styles.textRight}`} style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 16 }}>CO₂ Saved (kg)</th>
                </tr>
              </thead>
              <tbody>
                {leaderboardEntries.length === 0 ? (
                  <tr><td colSpan={4} className={styles.td} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No entries yet</td></tr>
                ) : (
                  leaderboardEntries.map((entry: LeaderboardEntry, i: number) => {
                    const isYou = !!(currentUser && (entry.userId === currentUser.id || (entry.name || '').toLowerCase() === (currentUser.name || '').toLowerCase() || (entry.name || '').toLowerCase() === (currentUser.email || '').toLowerCase()));
                    return (
                      <tr key={entry.id} className={isYou ? styles.highlightRow : ''}>
                        <td className={styles.td}>{i + 1}</td>
                        <td className={styles.td}>{isYou ? 'You' : entry.name}</td>
                        <td className={`${styles.td} ${styles.textRight}`}>{entry.distanceKm}</td>
                        <td className={`${styles.td} ${styles.textRight}`}>{entry.co2SavedKg}</td>
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
      
    </div>
  );
} 