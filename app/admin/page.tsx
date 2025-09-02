"use client";
import { useEffect, useState } from "react";
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({ name: '', distanceKm: '', co2SavedKg: '' } as { name: string; distanceKm: string; co2SavedKg: string });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    setError("");
    try {
      const [appsRes, bikesRes, lbRes] = await Promise.all([
        fetch("/api/admin/applications"),
        fetch("/api/admin/bikes"),
        fetch("/api/leaderboard?limit=5"),
      ]);
      
      const appsData = await appsRes.json();
      const bikesData = await bikesRes.json();
      const lbData = await lbRes.json();
      
      if (appsData.success && bikesData.success && lbData.success) {
        const applications = appsData.applications;
        const bikes = bikesData.bikes;
        const fetchedLb: LeaderboardEntry[] = lbData.entries || [];
        
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
        
        // Get currently rented bikes
        setRecentBikes(bikes.filter((b: any) => (b?.status || '').toLowerCase() === 'rented'));

        // Leaderboard entries
        setLeaderboard(Array.isArray(fetchedLb) ? fetchedLb : []);
      } else {
        setError("Failed to fetch dashboard data");
      }
    } catch {
      setError("Failed to fetch dashboard data");
    }
    setLoading(false);
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
                  const res = await fetch('/api/leaderboard', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
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
                            const res = await fetch('/api/leaderboard', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
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