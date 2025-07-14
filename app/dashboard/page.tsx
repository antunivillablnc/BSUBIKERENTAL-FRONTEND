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
    <div style={{ width: '100%', background: '#e5e7eb', borderRadius: 8, height: 10, marginTop: 8 }}>
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
  const [lastUpdated, setLastUpdated] = useState(new Date());
  // Progress goals
  const monthlyDistanceGoal = 100;
  const monthlyCO2Goal = 20;
  const [chartLoaded, setChartLoaded] = useState(ChartJSLoaded);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mock leaderboard
  const leaderboard = [
    { name: 'You', distance: travelDistanceKm },
    { name: 'Alex', distance: 38 },
    { name: 'Sam', distance: 35 },
    { name: 'Jamie', distance: 30 },
  ];

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

  // Render trends chart
  useEffect(() => {
    if (chartLoaded && chartRef.current && window.Chart) {
      const ctx = chartRef.current.getContext('2d');
      if (ctx) {
        if (window.myTrendsChart) window.myTrendsChart.destroy();
        window.myTrendsChart = new window.Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
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
              legend: { display: true, position: 'top' },
              title: { display: true, text: 'Weekly Trends' },
            },
            scales: {
              y: { type: 'linear', display: true, position: 'left', title: { display: true, text: 'Distance (km)' } },
              y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'CO₂ (kg)' } },
              y2: { type: 'linear', display: false, position: 'right' },
            },
          },
        });
      }
    }
  }, [chartLoaded, distanceTrend, co2Trend]);

  return (
    <div style={{ minHeight: '100vh', background: '#f7f8fa', padding: '48px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', padding: 32 }}>
          <h1 style={{ color: '#1976d2', fontWeight: 800, fontSize: 32, marginBottom: 32, textAlign: 'center' }}>
            Dashboard
          </h1>
          {mounted && (
            <div style={{ textAlign: 'right', color: '#888', fontSize: 13, marginBottom: 10 }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </div>
          )}
          {/* Trends Chart */}
          <div style={{ margin: '0 auto 32px', maxWidth: 700, background: '#f8fafc', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(25, 118, 210, 0.04)' }}>
            <h2 style={{ color: '#1976d2', fontWeight: 700, fontSize: 20, marginBottom: 12 }}>Weekly Trends</h2>
            <canvas ref={chartRef} width={650} height={260} style={{ width: '100%', maxWidth: 650, background: '#fff', borderRadius: 8 }} />
            {!chartLoaded && <div style={{ color: '#888', textAlign: 'center', marginTop: 12 }}>Loading chart...</div>}
          </div>
          {/* Dashboard Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 28,
            marginTop: 12,
            marginBottom: 24,
          }}>
            {/* Bike Location Card */}
            <div style={{
              background: '#e3f2fd',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 2px 8px rgba(25, 118, 210, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'transform 0.3s, box-shadow 0.3s',
              willChange: 'transform',
            }}
              className="dashboard-card"
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>📍</div>
              <div style={{ fontWeight: 700, color: '#1976d2', fontSize: 18, marginBottom: 6 }}>Bike Location</div>
              <div style={{ color: '#444', fontSize: 16, textAlign: 'center' }}>{bikeLocation}</div>
              {/* TODO: Replace with real map/location data */}
            </div>
            {/* Travel Distance Card */}
            <div style={{
              background: '#e8f5e9',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'transform 0.3s, box-shadow 0.3s',
              willChange: 'transform',
            }}
              className="dashboard-card"
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>🚴‍♂️</div>
              <div style={{ fontWeight: 700, color: '#22c55e', fontSize: 18, marginBottom: 6 }}>Travel Distance</div>
              <div style={{ color: '#444', fontSize: 16 }}>{travelDistanceKm} km</div>
              <Sparkline data={distanceTrend} color="#22c55e" />
              <ProgressBar value={travelDistanceKm} max={monthlyDistanceGoal} color="#22c55e" />
              <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Goal: {monthlyDistanceGoal} km</div>
              {/* TODO: Replace with real distance data */}
            </div>
            {/* Cost Savings Card */}
            <div style={{
              background: '#fffde7',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 2px 8px rgba(251, 191, 36, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'transform 0.3s, box-shadow 0.3s',
              willChange: 'transform',
            }}
              className="dashboard-card"
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>💸</div>
              <div style={{ fontWeight: 700, color: '#f59e42', fontSize: 18, marginBottom: 6 }}>Cost Savings</div>
              <div style={{ color: '#444', fontSize: 16 }}>₱{costSavings.toLocaleString()}</div>
              {/* TODO: Replace with real cost savings calculation */}
            </div>
            {/* CO₂ Emission Savings Card */}
            <div style={{
              background: '#f3e5f5',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'transform 0.3s, box-shadow 0.3s',
              willChange: 'transform',
            }}
              className="dashboard-card"
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>🌱</div>
              <div style={{ fontWeight: 700, color: '#8b5cf6', fontSize: 18, marginBottom: 6 }}>CO₂ Emission Savings</div>
              <div style={{ color: '#444', fontSize: 16 }}>{co2SavingsKg} kg</div>
              <Sparkline data={co2Trend} color="#8b5cf6" />
              <ProgressBar value={co2SavingsKg} max={monthlyCO2Goal} color="#8b5cf6" />
              <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Goal: {monthlyCO2Goal} kg</div>
              {/* TODO: Replace with real CO2 savings calculation */}
            </div>
          </div>
          {/* Personal Bests & Fun Facts */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, marginTop: 24, marginBottom: 24, justifyContent: 'center' }}>
            <div style={{ background: '#f4f6fb', border: '1px solid #d1d5db', borderRadius: 12, padding: 24, minWidth: 220, flex: 1, boxShadow: '0 2px 8px rgba(25, 118, 210, 0.06)' }}>
              <h3 style={{ color: '#1565c0', fontWeight: 800, fontSize: 20, marginBottom: 10 }}>Personal Bests</h3>
              <div style={{ color: '#222', fontSize: 16, marginBottom: 4 }}>🚴‍♂️ Longest Ride: <b>{personalBests.longestRide} km</b></div>
              <div style={{ color: '#222', fontSize: 16, marginBottom: 4 }}>📅 Most in a Week: <b>{personalBests.mostInWeek} km</b></div>
              <div style={{ color: '#222', fontSize: 16 }}>📆 Most in a Month: <b>{personalBests.mostInMonth} km</b></div>
            </div>
            <div style={{ background: '#f4fdf6', border: '1px solid #b6e4c7', borderRadius: 12, padding: 24, minWidth: 220, flex: 1, boxShadow: '0 2px 8px rgba(34, 197, 94, 0.06)' }}>
              <h3 style={{ color: '#22c55e', fontWeight: 800, fontSize: 20, marginBottom: 10 }}>Environmental Impact</h3>
              <div style={{ color: '#222', fontSize: 16, marginBottom: 4 }}>🌳 Trees Planted Equivalent: <b>{treesPlanted}</b></div>
              <div style={{ color: '#222', fontSize: 16 }}>🚗 Car km Avoided: <b>{carKmAvoided} km</b></div>
            </div>
            <div style={{ background: '#fdf6f4', border: '1px solid #fbc19d', borderRadius: 12, padding: 24, minWidth: 220, flex: 1, boxShadow: '0 2px 8px rgba(251, 191, 36, 0.06)' }}>
              <h3 style={{ color: '#f59e42', fontWeight: 800, fontSize: 20, marginBottom: 10 }}>Goal Tracker</h3>
              <div style={{ color: '#222', fontSize: 16 }}>Distance Goal: <b>{Math.round((travelDistanceKm/monthlyDistanceGoal)*100)}%</b> complete</div>
              <ProgressBar value={travelDistanceKm} max={monthlyDistanceGoal} color="#22c55e" />
              <div style={{ color: '#222', fontSize: 16, marginTop: 10 }}>CO₂ Goal: <b>{Math.round((co2SavingsKg/monthlyCO2Goal)*100)}%</b> complete</div>
              <ProgressBar value={co2SavingsKg} max={monthlyCO2Goal} color="#8b5cf6" />
            </div>
          </div>
          {/* Leaderboard */}
          <div style={{ background: '#f4f6fb', border: '1px solid #d1d5db', borderRadius: 12, padding: 24, maxWidth: 500, margin: '0 auto', boxShadow: '0 2px 8px rgba(25, 118, 210, 0.06)' }}>
            <h3 style={{ color: '#1565c0', fontWeight: 800, fontSize: 20, marginBottom: 10 }}>Leaderboard (Top Distance This Week)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#e3f2fd' }}>
                  <th style={{ padding: 8, textAlign: 'left', fontWeight: 700, color: '#1565c0', fontSize: 16 }}>User</th>
                  <th style={{ padding: 8, textAlign: 'right', fontWeight: 700, color: '#1565c0', fontSize: 16 }}>Distance (km)</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, i) => (
                  <tr key={entry.name} style={{ background: entry.name === 'You' ? '#bbf7d0' : 'transparent', fontWeight: entry.name === 'You' ? 800 : 500, color: '#222' }}>
                    <td style={{ padding: 8 }}>{entry.name}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>{entry.distance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          box-shadow: 0 8px 32px rgba(25, 118, 210, 0.12), 0 2px 8px rgba(0,0,0,0.10);
        }
      `}</style>
    </div>
  );
} 