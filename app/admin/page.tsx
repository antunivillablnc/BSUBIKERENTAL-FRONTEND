"use client";
import { useEffect, useState } from "react";
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

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentApplications, setRecentApplications] = useState<RecentApplication[]>([]);
  const [recentBikes, setRecentBikes] = useState<RecentBike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    setError("");
    try {
      const [appsRes, bikesRes] = await Promise.all([
        fetch("/api/admin/applications"),
        fetch("/api/admin/bikes"),
      ]);
      
      const appsData = await appsRes.json();
      const bikesData = await bikesRes.json();
      
      if (appsData.success && bikesData.success) {
        const applications = appsData.applications;
        const bikes = bikesData.bikes;
        
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
        
        // Get recent bikes (last 5)
        setRecentBikes(bikes.slice(0, 5));
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
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#1976d2', marginBottom: 16 }}>Loading dashboard...</h2>
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

        {/* Quick Actions */}
        <div style={{ marginBottom: 32 }}>
          <h2 style={{ color: '#111827', fontWeight: 700, fontSize: 24, marginBottom: 20, textAlign: 'center' }}>
            Quick Actions
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            <QuickActionCard
              title="Manage Applications"
              description="Review and assign bikes to rental applications"
              href="/admin/applications"
              color="#1976d2"
            />
            <QuickActionCard
              title="Manage Bikes"
              description="Add, edit, and monitor bike inventory"
              href="/admin/bikes"
              color="#22c55e"
            />
            <QuickActionCard
              title="Manage Accounts"
              description="Create, edit, and manage user accounts"
              href="/admin/users"
              color="#8b5cf6"
            />
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

          {/* Recent Bikes */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ color: '#111827', fontWeight: 700, fontSize: 20, margin: 0 }}>Recent Bikes</h3>
              <Link href="/admin/bikes" style={{ color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}>
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
              <p style={{ color: '#6b7280', textAlign: 'center', fontStyle: 'italic' }}>No bikes yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 