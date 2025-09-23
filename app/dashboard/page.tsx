"use client";
import { useEffect, useState } from "react";
import DashboardMap from "../components/DashboardMap";

// Simple circular progress component
function CircularProgress({ value, max, color, size = 80, strokeWidth = 8 }: { 
  value: number; 
  max: number; 
  color: string; 
  size?: number; 
  strokeWidth?: number; 
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const percent = Math.min(100, (value / max) * 100);
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
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          {value.toFixed(1)}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          {max > 1000 ? 'kcal' : 'kg'}
        </div>
      </div>
    </div>
  );
}

// Weekly activity bar chart component
function WeeklyActivity({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const days = ['10', '12', '14', '16', '18'];
  
  return (
    <div style={{ display: 'flex', alignItems: 'end', gap: 8, height: 80 }}>
      {data.slice(0, 5).map((value, i) => {
        const height = (value / max) * 60;
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div 
              style={{ 
                width: 20, 
                height: Math.max(height, 4), 
                background: '#22c55e', 
                borderRadius: 4,
                marginBottom: 8,
                transition: 'height 0.3s ease'
              }} 
            />
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{days[i]}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  // Simulated data matching the design
  const [distanceKm] = useState(15.2);
  const [co2SavedKg] = useState(1.8);
  const [caloriesBurned] = useState(450);
  const [weeklyData] = useState([20, 35, 40, 45, 55]);
  const [longestRide] = useState(75);
  const [fastestSpeed] = useState(35);

  return (
    <div className="dashboard-container">
      {/* Main Map Section */}
      <div className="map-section">
        <DashboardMap distanceKm={distanceKm} height={320} />
      </div>

      {/* Metrics Cards Row */}
      <div className="metrics-row">
        {/* CO2 Saved Card */}
        <div className="metric-card co2-card">
          <div className="metric-icon">🌱</div>
          <div className="metric-content">
            <div className="metric-label">CO₂ Saved</div>
            <CircularProgress value={co2SavedKg} max={5} color="#22c55e" size={70} />
          </div>
        </div>

        {/* Calories Burned Card */}
        <div className="metric-card calories-card">
          <div className="metric-icon">🔥</div>
          <div className="metric-content">
            <div className="metric-label">Calories Burned</div>
            <CircularProgress value={caloriesBurned} max={1000} color="#f97316" size={70} />
          </div>
        </div>

        {/* Kilometers Biked Card */}
        <div className="metric-card distance-card">
          <div className="metric-icon">🚴‍♂️</div>
          <div className="metric-content">
            <div className="metric-label">Kilometers Biked</div>
            <CircularProgress value={distanceKm} max={25} color="#3b82f6" size={70} />
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

        {/* Personal Bests */}
        <div className="personal-bests-card">
          <div className="bests-header">
            <h3>Personal Bests</h3>
            <span className="settings-icon">⚙️</span>
          </div>
          <div className="best-item">
            <span>Longest Ride:</span>
            <span className="best-value">{longestRide} km</span>
          </div>
          <div className="best-item">
            <span>Fastest Speed:</span>
            <span className="best-value">{fastestSpeed} km/h</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .dashboard-container {
          min-height: 100vh;
          background: #f1f5f9;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .map-section {
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
        }

        .metrics-row {
          display: flex;
          gap: 16px;
          justify-content: center;
          flex-wrap: wrap;
          max-width: 800px;
          margin: 0 auto;
        }

        .metric-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          display: flex;
          align-items: center;
          gap: 16px;
          min-width: 200px;
          flex: 1;
        }

        .metric-icon {
          font-size: 32px;
        }

        .metric-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .metric-label {
          font-size: 14px;
          font-weight: 600;
          color: #64748b;
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
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
          flex: 1;
        }

        .activity-card h3 {
          margin: 0 0 20px 0;
          font-size: 18px;
          font-weight: 700;
          color: #1e293b;
        }

        .personal-bests-card {
          background: white;
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
          color: #1e293b;
        }

        .settings-icon {
          font-size: 16px;
          opacity: 0.6;
        }

        .best-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          font-size: 14px;
          color: #64748b;
        }

        .best-value {
          font-weight: 700;
          color: #1e293b;
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
          .dashboard-container {
            padding: 16px;
            gap: 16px;
          }

          .metrics-row {
            flex-direction: column;
            align-items: center;
          }

          .metric-card {
            min-width: unset;
            width: 100%;
            max-width: 400px;
          }

          .bottom-section {
            flex-direction: column;
          }

          .map-section {
            max-width: 100%;
          }
        }

        /* Small mobile */
        @media (max-width: 480px) {
          .dashboard-container {
            padding: 12px;
          }

          .metric-card {
            padding: 16px;
            gap: 12px;
          }

          .metric-icon {
            font-size: 24px;
          }

          .activity-card,
          .personal-bests-card {
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
} 