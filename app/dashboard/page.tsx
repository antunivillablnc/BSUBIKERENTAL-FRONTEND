"use client";
import { useEffect, useState } from "react";
import DashboardMap from "../components/DashboardMap";
import BikeLoader from "../components/BikeLoader";
import { getApiBaseUrl } from "@/lib/apiClient";

// Static assumptions for CO₂ calculation
// CO2 (kg) = Distance (km) × (Fuel Consumption L/100km) × (Emission Factor kg CO2/L) / 100
const FUEL_CONSUMPTION_L_PER_100KM = 7.5; // average small car
const EMISSION_FACTOR_KG_CO2_PER_L = 2.31; // gasoline tailpipe CO2
// Defaults for calorie estimation using MET formula
// Calories (kcal) = MET × Weight(kg) × Time(hours); Time = Distance / Speed
const DEFAULT_MET = 8.0;         // moderate cycling
const DEFAULT_WEIGHT_KG = 70;    // typical rider
const DEFAULT_SPEED_KMH = 16;    // average moving speed

// Simple circular progress component
function CircularProgress({ value, max, color, size = 80, strokeWidth = 8, unit, goal }: { 
  value: number; 
  max: number; 
  color: string; 
  size?: number; 
  strokeWidth?: number; 
  unit?: string;
  goal?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Use goal for progress calculation if provided, otherwise use max
  const target = goal || max;
  const percent = Math.min(100, (value / target) * 100);
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
          {value.toFixed(1)}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
          {unit || 'units'}
        </div>
        {goal && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
            Goal: {goal}
          </div>
        )}
      </div>
    </div>
  );
}

// Simple and reliable weekly activity chart
function WeeklyActivity({ data }: { data: { day: string; distance: number; calories: number; co2: number }[] }) {
  const [activeMetric, setActiveMetric] = useState<'distance' | 'calories' | 'co2'>('distance');
  
  const getValue = (item: typeof data[0]) => {
    switch (activeMetric) {
      case 'distance': return item.distance;
      case 'calories': return item.calories;
      case 'co2': return item.co2;
      default: return item.distance;
    }
  };
  
  const getUnit = () => {
    switch (activeMetric) {
      case 'distance': return 'km';
      case 'calories': return 'kcal';
      case 'co2': return 'kg';
    }
  };
  
  const getColor = () => {
    switch (activeMetric) {
      case 'distance': return '#3b82f6';
      case 'calories': return '#f97316';
      case 'co2': return '#22c55e';
    }
  };
  
  const maxValue = Math.max(...data.map(getValue), 1);
  
  return (
    <div style={{ width: '100%' }}>
      {/* Metric Selector */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '20px',
        background: 'var(--bg-tertiary)',
        padding: '4px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)'
      }}>
        {(['distance', 'calories', 'co2'] as const).map((metric) => (
          <button
            key={metric}
            onClick={() => setActiveMetric(metric)}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: 'none',
              background: activeMetric === metric ? 'var(--card-bg)' : 'transparent',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '500',
              color: activeMetric === metric ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: activeMetric === metric ? '0 1px 3px var(--shadow-color)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            {metric === 'distance' ? 'Distance' : metric === 'calories' ? 'Calories' : 'CO₂ Saved'}
          </button>
        ))}
      </div>
      
      {/* Simple Chart */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-end', 
        justifyContent: 'space-between',
        height: '100px',
        padding: '0 8px',
        gap: '8px',
        marginBottom: '16px'
      }}>
        {data.map((item, i) => {
          const value = getValue(item);
          const height = Math.max((value / maxValue) * 80, 6);
          
          return (
            <div 
              key={i}
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                flex: 1,
                gap: '8px'
              }}
            >
              {/* Bar */}
              <div
                style={{
                  width: '20px',
                  height: `${height}px`,
                  backgroundColor: getColor(),
                  borderRadius: '3px 3px 0 0',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
                title={`${item.day}: ${value.toFixed(1)} ${getUnit()}`}
              />
              
              {/* Day Label */}
              <div style={{ 
                fontSize: '11px', 
                fontWeight: '500', 
                color: 'var(--text-secondary)'
              }}>
                {item.day}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Summary */}
      <div style={{ 
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
            Total this week:
          </span>
          <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {data.reduce((sum, item) => sum + getValue(item), 0).toFixed(1)} {getUnit()}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '500' }}>
            Daily average:
          </span>
          <span style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>
            {(data.reduce((sum, item) => sum + getValue(item), 0) / data.length).toFixed(1)} {getUnit()}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  // Loading indicator like Home page
  const [initializing, setInitializing] = useState(true);
  useEffect(() => {
    const id = setTimeout(() => setInitializing(false), 800);
    return () => clearTimeout(id);
  }, []);

  // CO₂ estimation constants:
  // - Average small car fuel consumption (liters per 100 km)
  // - Gasoline CO₂ emission factor (kg per liter)
  const FUEL_CONSUMPTION_L_PER_100KM = 7.5;
  const EMISSION_FACTOR_KG_CO2_PER_L = 2.31;
  // Calorie estimation parameters (MET-based)
  const MET = DEFAULT_MET;
  const WEIGHT_KG = DEFAULT_WEIGHT_KG;
  const AVG_SPEED_KMH = DEFAULT_SPEED_KMH;

  // Live data state (with sensible defaults as fallback)
  const [distanceKm, setDistanceKm] = useState(15.2);
  const [co2SavedKg, setCo2SavedKg] = useState(1.8);
  const [caloriesBurned, setCaloriesBurned] = useState(450);
  const [weeklyData, setWeeklyData] = useState([
    { day: 'Mon', distance: 12.5, calories: 380, co2: 1.2 },
    { day: 'Tue', distance: 8.3, calories: 250, co2: 0.8 },
    { day: 'Wed', distance: 15.7, calories: 470, co2: 1.5 },
    { day: 'Thu', distance: 6.2, calories: 190, co2: 0.6 },
    { day: 'Fri', distance: 18.9, calories: 580, co2: 1.8 },
    { day: 'Sat', distance: 22.1, calories: 680, co2: 2.1 },
    { day: 'Sun', distance: 14.3, calories: 440, co2: 1.4 }
  ]);
  const [longestRide, setLongestRide] = useState(75);
  const [fastestSpeed, setFastestSpeed] = useState(35);
  const [assignedBike, setAssignedBike] = useState<{ bikeId: string; bikeName?: string | null; deviceId?: string | null } | null>(null);

  // Recompute CO₂ using static formula whenever distance changes
  useEffect(() => {
    const co2 = (distanceKm * FUEL_CONSUMPTION_L_PER_100KM * EMISSION_FACTOR_KG_CO2_PER_L) / 100;
    setCo2SavedKg(co2);
  }, [distanceKm]);

  // Recompute Calories using MET formula whenever distance changes
  useEffect(() => {
    const hours = distanceKm / Math.max(AVG_SPEED_KMH, 1e-6);
    const kcal = MET * WEIGHT_KG * hours;
    setCaloriesBurned(Math.max(0, Math.round(kcal)));
  }, [distanceKm]);

  // Assigned bike lookup + analytics fetch
  useEffect(() => {
    let cancelled = false;
    async function load() {
      async function tryViaNextApi() {
        const resp = await fetch('/api/me/assigned-bike', { credentials: 'include', cache: 'no-store' });
        if (!resp.ok) throw new Error('failed assigned bike');
        const data = await resp.json();
        if (!data?.success) throw new Error('no assigned');
        if (!cancelled) setAssignedBike({ bikeId: String(data.bikeId), bikeName: data.bikeName, deviceId: data.deviceId || null });

        // Try to resolve deviceId via backend (preferred, since Next API route may not exist in prod)
        try {
          if (data?.deviceId) return; // already resolved
          const base = getApiBaseUrl();
          if (base) {
            const bResp = await fetch(`${base}/bikes/${encodeURIComponent(String(data.bikeId))}`, { credentials: 'include' as RequestCredentials });
            if (bResp.ok) {
              const b = await bResp.json();
              if (b?.success && b?.bike?.deviceId && !cancelled) {
                setAssignedBike((prev) => prev ? { ...prev, deviceId: String(b.bike.deviceId) } : prev);
              }
            }
          }
        } catch {}

        // Analytics from Next API (optional; safe to ignore failures)
        try {
          const params = new URLSearchParams();
          if (data.bikeId) params.set('bikeId', data.bikeId);
          if (data.bikeName) params.set('bikeName', data.bikeName);
          const aResp = await fetch(`/api/analytics/by-bike?${params.toString()}`, { cache: 'no-store' });
          if (aResp.ok) {
            const a = await aResp.json();
          if (a?.success && !cancelled) {
            const dKm = Number(a.distanceKmToday || 0);
            // Do not overwrite live distance with zero
            setDistanceKm(prev => (dKm > 0 ? dKm : prev));
            // Only adopt CO₂ from API when it is positive; otherwise keep computed value
            const apiCo2 = Number(a.co2SavedKgToday);
            if (Number.isFinite(apiCo2) && apiCo2 > 0) {
              setCo2SavedKg(apiCo2);
            }
            const apiKcal = Number(a.caloriesBurnedToday);
            if (Number.isFinite(apiKcal) && apiKcal > 0) {
              setCaloriesBurned(Math.round(apiKcal));
            }
              if (Array.isArray(a.weekly) && a.weekly.length) {
                setWeeklyData(a.weekly.map((w: any) => ({
                  day: String(w.day || ''),
                  distance: Number(w.distance || 0),
                  calories: Number(w.calories || 0),
                  co2: Number(w.co2 || 0),
                })));
              }
              setLongestRide(Number(a.longestRideKm || 0));
              setFastestSpeed(Number(a.fastestSpeedKmh || 0));
            }
          }
        } catch {}
      }

      async function fallbackViaBackend() {
        const base = getApiBaseUrl();
        if (!base) return;
        // get user id/email from localStorage
        let uid: string | undefined;
        let email: string | undefined;
        try {
          const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
          const u = raw ? JSON.parse(raw) : null;
          uid = u?.id || u?._id || undefined;
          email = u?.email || undefined;
        } catch {}
        const q = uid ? `userId=${encodeURIComponent(String(uid))}` : (email ? `email=${encodeURIComponent(String(email))}` : '');
        if (!q) return;
        const resp = await fetch(`${base}/dashboard?${q}`, { credentials: 'include' as RequestCredentials });
        if (!resp.ok) return;
        const dj = await resp.json();
        const apps = Array.isArray(dj?.applications) ? dj.applications : [];
        const activeStatuses = new Set(['assigned', 'active', 'approved']);
        const currentApp = apps
          .filter((a: any) => activeStatuses.has(String(a.status || '').toLowerCase()) && a.bikeId)
          .sort((a: any, b: any) => new Date(b.createdAt || b.assignedAt || 0).getTime() - new Date(a.createdAt || a.assignedAt || 0).getTime())[0];
        if (!currentApp?.bikeId) return;
        if (!cancelled) setAssignedBike({ bikeId: String(currentApp.bikeId), bikeName: currentApp.bikeName || null, deviceId: null });
        try {
          const bResp = await fetch(`${base}/bikes/${encodeURIComponent(String(currentApp.bikeId))}`, { credentials: 'include' as RequestCredentials });
          if (bResp.ok) {
            const b = await bResp.json();
            if (b?.success && b?.bike?.deviceId && !cancelled) {
              setAssignedBike((prev) => prev ? { ...prev, deviceId: String(b.bike.deviceId) } : prev);
            }
          }
        } catch {}
      }

      try {
        await tryViaNextApi();
      } catch {
        await fallbackViaBackend();
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Goals state with localStorage persistence
  const [goals, setGoals] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedGoals = localStorage.getItem('bikeRentalGoals');
      return savedGoals ? JSON.parse(savedGoals) : {
        co2: 5.0,
        calories: 600,
        distance: 20.0
      };
    }
    return {
      co2: 5.0,
      calories: 600,
      distance: 20.0
    };
  });

  const [showGoalSettings, setShowGoalSettings] = useState(false);

  // Save goals to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bikeRentalGoals', JSON.stringify(goals));
    }
  }, [goals]);

  if (initializing) {
    return (
      <div style={{ minHeight: '100vh', background: `url('/car-rental-app.jpg') center center / cover no-repeat fixed`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(80,80,80,0.7)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <BikeLoader />
          <div style={{ color: '#ffffff', fontWeight: 800, fontSize: 18, letterSpacing: 1, textShadow: '0 2px 8px rgba(0,0,0,0.45)' }}>Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Main Map Section */}
      <div className="map-section">
        <DashboardMap
          distanceKm={distanceKm}
          height={320}
          bikeId={assignedBike?.bikeId}
          deviceId={assignedBike?.deviceId || undefined}
          onDistanceChange={(km) => setDistanceKm(km)}
          trailPointLimit={500}
          snapToRoads
          snapProfile="cycling"
          snapMode="directions"
        />
      </div>

      {/* Metrics Cards Row */}
      <div className="metrics-row">
        {/* CO2 Saved Card */}
        <div className="metric-card co2-card">
          <div className="metric-icon">🌱</div>
          <div className="metric-center-content">
            <div className="metric-label">CO₂ Saved</div>
            <CircularProgress 
              value={co2SavedKg} 
              max={5} 
              color="#22c55e" 
              size={100} 
              unit="kg"
              goal={goals.co2}
            />
          </div>
        </div>

        {/* Calories Burned Card */}
        <div className="metric-card calories-card">
          <div className="metric-icon">🔥</div>
          <div className="metric-center-content">
            <div className="metric-label">Calories Burned</div>
            <CircularProgress 
              value={caloriesBurned} 
              max={1000} 
              color="#f97316" 
              size={100} 
              unit="kcal"
              goal={goals.calories}
            />
          </div>
        </div>

        {/* Kilometers Biked Card */}
        <div className="metric-card distance-card">
          <div className="metric-icon">🚴‍♂️</div>
          <div className="metric-center-content">
            <div className="metric-label">Kilometers Biked</div>
            <CircularProgress 
              value={distanceKm} 
              max={25} 
              color="#3b82f6" 
              size={100} 
              unit="km"
              goal={goals.distance}
            />
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="bottom-section">
        {/* Weekly Activity */}
        <div className="activity-card">
          <h3>Weekly Activity</h3>
          <WeeklyActivity data={weeklyData} />
        </div>

        {/* Personal Bests & Goals */}
        <div className="personal-bests-card">
          <div className="bests-header">
            <h3>Personal Bests & Goals</h3>
            <button 
              className="settings-button"
              onClick={() => setShowGoalSettings(!showGoalSettings)}
              title="Set Goals"
            >
              ⚙️
            </button>
          </div>
          
          {showGoalSettings && (
            <div className="goal-settings">
              <h4>Set Your Goals</h4>
              <div className="goal-input-group">
                <label>CO₂ Saved (kg):</label>
                <input
                  type="number"
                  value={goals.co2}
                  onChange={(e) => setGoals({...goals, co2: parseFloat(e.target.value) || 0})}
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="goal-input-group">
                <label>Calories (kcal):</label>
                <input
                  type="number"
                  value={goals.calories}
                  onChange={(e) => setGoals({...goals, calories: parseFloat(e.target.value) || 0})}
                  min="0"
                  step="10"
                />
              </div>
              <div className="goal-input-group">
                <label>Distance (km):</label>
                <input
                  type="number"
                  value={goals.distance}
                  onChange={(e) => setGoals({...goals, distance: parseFloat(e.target.value) || 0})}
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
          )}
          
          <div className="best-item">
            <span>Longest Ride:</span>
            <span className="best-value">{longestRide} km</span>
          </div>
          <div className="best-item">
            <span>Fastest Speed:</span>
            <span className="best-value">{fastestSpeed} km/h</span>
          </div>
          
          <div className="goal-progress-section">
            <h4>Today's Progress</h4>
            <div className="goal-progress-item">
              <span>CO₂ Goal:</span>
              <span className="progress-text">
                {co2SavedKg.toFixed(1)} / {goals.co2} kg 
                ({Math.round((co2SavedKg / goals.co2) * 100)}%)
              </span>
            </div>
            <div className="goal-progress-item">
              <span>Calories Goal:</span>
              <span className="progress-text">
                {caloriesBurned} / {goals.calories} kcal 
                ({Math.round((caloriesBurned / goals.calories) * 100)}%)
              </span>
            </div>
            <div className="goal-progress-item">
              <span>Distance Goal:</span>
              <span className="progress-text">
                {distanceKm.toFixed(1)} / {goals.distance} km 
                ({Math.round((distanceKm / goals.distance) * 100)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background: url('/car-rental-app.jpg') center center / cover no-repeat fixed;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
        }

        .dashboard-container::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(80,80,80,0.7);
          z-index: 0;
          pointer-events: none;
        }

        /* Dark mode overrides: keep image background, adjust card/text only */
        :global(.dark) .metric-card,
        :global(.dark) .activity-card,
        :global(.dark) .personal-bests-card {
          background: var(--card-bg);
          box-shadow: 0 8px 24px var(--shadow-color);
        }

        :global(.dark) .metric-label,
        :global(.dark) .best-item,
        :global(.dark) .goal-settings h4,
        :global(.dark) .goal-progress-item {
          color: var(--text-secondary);
        }

        :global(.dark) .best-value,
        :global(.dark) .activity-card h3,
        :global(.dark) .bests-header h3,
        :global(.dark) .progress-text {
          color: var(--text-primary);
        }

        .dashboard-container > * {
          position: relative;
          z-index: 1;
        }

        .map-section {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }

        .metrics-row {
          display: flex;
          gap: 20px;
          justify-content: center;
          flex-wrap: wrap;
          max-width: 1000px;
          margin: 0 auto;
        }

        .metric-card {
          background: var(--card-bg);
          border-radius: 20px;
          padding: 32px 24px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          min-width: 280px;
          flex: 1;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          position: relative;
        }

        .metric-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.15);
        }

        .metric-icon {
          font-size: 40px;
          flex-shrink: 0;
        }

        .metric-center-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          flex: 1;
          text-align: center;
        }

        .metric-label {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-secondary);
          text-align: center;
        }

        .bottom-section {
          display: flex;
          gap: 20px;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
        }

        .activity-card {
          background: var(--card-bg);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          flex: 1;
        }

        .activity-card h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .personal-bests-card {
          background: var(--card-bg);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          flex: 1;
        }

        .bests-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .bests-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .settings-button {
          background: var(--card-bg);
          border: 2px solid var(--border-color);
          font-size: 22px;
          opacity: 0.9;
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 10px;
          transition: opacity 0.2s ease, background-color 0.2s ease, transform 0.1s ease;
          box-shadow: 0 2px 6px var(--shadow-color);
        }

        .settings-button:hover {
          opacity: 1;
          background-color: var(--hover-bg);
        }

        .settings-button:active {
          transform: scale(0.98);
        }

        .best-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .best-value {
          font-weight: 700;
          color: var(--text-primary);
        }

        .goal-settings {
          background: var(--bg-tertiary);
          border-radius: 8px;
          padding: 16px;
          margin-bottom: 20px;
          border: 1px solid var(--border-color);
        }

        .goal-settings h4 {
          margin: 0 0 16px 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .goal-input-group {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .goal-input-group label {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
        }

        .goal-input-group input {
          width: 80px;
          padding: 6px 8px;
          border: 1px solid var(--input-border);
          background: var(--input-bg);
          color: var(--text-primary);
          border-radius: 4px;
          font-size: 13px;
          text-align: right;
        }

        .goal-input-group input:focus {
          outline: none;
          border-color: var(--accent-color);
          box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.15);
        }

        .goal-progress-section {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .goal-progress-section h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .goal-progress-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          font-size: 13px;
          color: var(--text-secondary);
        }

        .progress-text {
          font-weight: 600;
          color: var(--text-primary);
        }


        /* Tablet Responsive */
        @media (max-width: 1024px) {
          .metrics-row {
            max-width: 100%;
            gap: 16px;
          }

          .metric-card {
            min-width: 240px;
          }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .dashboard-container {
            padding: 12px;
            gap: 16px;
          }

          .metrics-row {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
            margin: 0;
            max-width: 100%;
          }

          .metric-card {
            min-width: unset;
            width: 100%;
            max-width: none;
            padding: 24px 16px;
            margin: 0;
            justify-content: space-between;
          }

          .metric-center-content {
            flex-direction: row;
            align-items: center;
            gap: 16px;
            text-align: left;
            justify-content: space-between;
          }

          .metric-label {
            text-align: left;
            margin: 0;
            flex: 1;
          }

          .bottom-section {
            flex-direction: column;
          }

          .map-section {
            max-width: 100%;
            margin: 0;
          }
        }

        /* Small mobile */
        @media (max-width: 480px) {
          .dashboard-container {
            padding: 8px;
          }

          .metric-card {
            padding: 20px 12px;
            gap: 12px;
          }

          .metric-icon {
            font-size: 32px;
          }

          .activity-card,
          .personal-bests-card {
            padding: 16px;
          }

        }
      `}</style>
    </div>
  );
} 