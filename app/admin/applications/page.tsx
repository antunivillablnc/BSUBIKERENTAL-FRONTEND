"use client";
import { useEffect, useState } from "react";

interface Application {
  id: string;
  lastName: string;
  firstName: string;
  email: string;
  status: string;
  bikeId?: string;
  bike?: { id: string; name: string } | null;
  createdAt: string;
}

interface Bike {
  id: string;
  name: string;
  status: string;
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignError, setAssignError] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'assigned'>('all');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
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
        setApplications(appsData.applications);
        setBikes(bikesData.bikes);
      } else {
        setError("Failed to fetch data");
      }
    } catch {
      setError("Failed to fetch data");
    }
    setLoading(false);
  }

  async function handleAssign(appId: string, bikeId: string) {
    setAssigning(appId);
    setAssignError("");
    try {
      const res = await fetch("/api/admin/assign-bike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId, bikeId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        setAssignError(data.error || "Failed to assign bike.");
      }
    } catch {
      setAssignError("Failed to assign bike.");
    }
    setAssigning(null);
  }

  // Filtered applications based on statusFilter
  const filteredApplications = applications.filter(app => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return !app.bikeId;
    if (statusFilter === 'assigned') return !!app.bikeId;
    return true;
  });

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f8fa' }}>
      <h2 style={{ color: '#1976d2' }}>Loading applications...</h2>
    </div>;
  }

  return (
    <div style={{ padding: '48px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', padding: 32 }}>
          <h1 style={{ color: '#1976d2', fontWeight: 800, fontSize: 32, marginBottom: 32, textAlign: 'center' }}>
            Rental Applications Management
          </h1>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 0 }}>
            <div style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              borderRadius: 999,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              padding: 4,
              gap: 2,
            }}>
              {[
                { label: 'All', value: 'all' },
                { label: 'Pending', value: 'pending' },
                { label: 'Assigned', value: 'assigned' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value as typeof statusFilter)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: statusFilter === opt.value ? '#1976d2' : 'transparent',
                    color: statusFilter === opt.value ? '#fff' : '#1976d2',
                    fontWeight: 700,
                    fontSize: 15,
                    borderRadius: 999,
                    padding: '8px 28px',
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {/* Add a small margin below the tabs, above the table */}
          <div style={{ height: 20 }} />
          {error && <div style={{ color: '#b22222', fontWeight: 600, marginBottom: 18 }}>{error}</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Name</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Email</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Status</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Bike</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Applied</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Assign Bike</th>
              </tr>
            </thead>
            <tbody>
              {filteredApplications.map(app => (
                <tr key={app.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 10, color: '#111' }}>{app.lastName}, {app.firstName}</td>
                  <td style={{ padding: 10, color: '#111' }}>{app.email}</td>
                  <td style={{ padding: 10, color: '#111' }}>{app.bikeId ? 'Assigned' : 'Pending'}</td>
                  <td style={{ padding: 10, color: '#111' }}>{app.bike ? app.bike.name : '-'}</td>
                  <td style={{ padding: 10, color: '#111' }}>{new Date(app.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: 10 }}>
                    {app.bikeId ? (
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>Assigned</span>
                    ) : (
                      <>
                        <select
                          style={{ padding: '6px 12px', borderRadius: 6, border: '1.5px solid #e0e0e0', fontSize: 15, marginRight: 8 }}
                          disabled={assigning === app.id}
                          defaultValue=""
                          onChange={e => handleAssign(app.id, e.target.value)}
                        >
                          <option value="" disabled>Select bike</option>
                          {bikes.filter(b => b.status === 'available').map(bike => (
                            <option key={bike.id} value={bike.id}>{bike.name}</option>
                          ))}
                        </select>
                        {assigning === app.id && <span style={{ color: '#1976d2' }}>Assigning...</span>}
                        {assignError && <span style={{ color: '#b22222', fontWeight: 500 }}>{assignError}</span>}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 