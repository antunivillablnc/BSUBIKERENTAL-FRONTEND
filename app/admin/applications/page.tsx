"use client";
import { useEffect, useState } from "react";

interface Application {
  id: string;
  // Basic identity
  lastName: string;
  firstName: string;
  middleName?: string | null;
  srCode?: string;
  sex?: string;
  dateOfBirth?: string;

  // Contact
  phoneNumber?: string;
  email: string;

  // Academic
  collegeProgram?: string;
  gwaLastSemester?: string;
  extracurricularActivities?: string | null;

  // Address
  houseNo?: string;
  streetName?: string;
  barangay?: string;
  municipality?: string;
  province?: string;

  // Other details
  distanceFromCampus?: string;
  familyIncome?: string;
  intendedDuration?: string;
  intendedDurationOther?: string | null;
  certificatePath?: string | null;

  // Status / relations
  status: string;
  bikeId?: string | null;
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'assigned' | 'completed'>('all');
  const [emailFilter, setEmailFilter] = useState("");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

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

  async function handleUpdateStatus(appId: string, status: 'approved' | 'rejected' | 'pending') {
    setError("");
    try {
      const res = await fetch('/api/admin/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId, status }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedApp(prev => (prev && prev.id === appId ? { ...prev, status } : prev));
        fetchData();
      } else {
        setError(data.error || 'Failed to update application status.');
      }
    } catch {
      setError('Failed to update application status.');
    }
  }

  // End rental handled on Bikes page; no action here

  // Filtered applications based on statusFilter and emailFilter
  const filteredApplications = applications.filter(app => {
    const matchesEmail = app.email.toLowerCase().includes(emailFilter.toLowerCase());
    if (!matchesEmail) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return app.status === 'pending';
    if (statusFilter === 'assigned') return app.status === 'assigned' || !!app.bikeId;
    if (statusFilter === 'completed') return app.status === 'completed';
    return true;
  });

  // Sort with rejected at the very bottom, then completed, then assigned, then others; newest first within each group
  const sortedApplications = [...filteredApplications].sort((a, b) => {
    const rank = (app: Application) => {
      if (app.status === 'rejected') return 3;
      if (app.status === 'completed') return 2;
      if (app.status === 'assigned' || app.bikeId) return 1;
      return 0;
    };
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  function formatDate(value?: string) {
    if (!value) return '-';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f8fa' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div className="flash-spinner" />
          <h2 style={{ color: '#1976d2', margin: 0 }}>Loading applications...</h2>
        </div>
        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          .flash-spinner {
            width: 74px; height: 74px; border-radius: 50%;
            background: conic-gradient(#00e5ff, #00ff95, #ffd54f, #ff4081, #00e5ff);
            -webkit-mask: radial-gradient(farthest-side,#0000 calc(100% - 10px),#000 0);
                    mask: radial-gradient(farthest-side,#0000 calc(100% - 10px),#000 0);
            animation: spin 1s linear infinite;
            box-shadow: 0 0 22px rgba(0,0,0,0.06), 0 0 30px rgba(33,150,243,0.20);
          }
        `}</style>
      </div>
    );
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
                { label: 'Completed', value: 'completed' },
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
          {/* Email filter input */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '10px 0 20px 0' }}>
            <input
              type="text"
              placeholder="Search by email..."
              value={emailFilter}
              onChange={e => setEmailFilter(e.target.value)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1.5px solid #e0e0e0',
                fontSize: 16,
                minWidth: 220,
                outline: 'none',
                fontFamily: 'inherit',
                background: '#fff',
                color: '#222',
              }}
            />
          </div>
          {error && <div style={{ color: '#b22222', fontWeight: 600, marginBottom: 18 }}>{error}</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Name</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Email</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Bike</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Applied</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Details</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Assign Bike</th>
              </tr>
            </thead>
            <tbody>
              {sortedApplications.map(app => (
                <tr key={app.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 10, color: '#111' }}>{app.lastName}, {app.firstName}</td>
                  <td style={{ padding: 10, color: '#111' }}>{app.email}</td>
                  <td style={{ padding: 10, color: '#111' }}>{app.bike ? app.bike.name : '-'}</td>
                  <td style={{ padding: 10, color: '#111' }}>{new Date(app.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: 10 }}>
                    <button
                      onClick={() => setSelectedApp(app)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1.5px solid #e0e0e0',
                        background: '#fff',
                        cursor: 'pointer',
                        color: '#1976d2',
                        fontWeight: 700
                      }}
                    >
                      View
                    </button>
                  </td>
                  <td style={{ padding: 10 }}>
                    {app.bikeId ? (
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>Assigned</span>
                    ) : app.status === 'completed' ? (
                      <span style={{ color: '#6b7280', fontWeight: 600 }}>Completed</span>
                    ) : app.status === 'rejected' ? (
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>Rejected</span>
                    ) : (
                      <>
                        <select
                          style={{ padding: '6px 12px', borderRadius: 6, border: '1.5px solid #e0e0e0', fontSize: 15, marginRight: 8 }}
                          disabled={assigning === app.id || app.status !== 'approved'}
                          defaultValue=""
                          onChange={e => handleAssign(app.id, e.target.value)}
                        >
                          <option value="" disabled>{app.status !== 'approved' ? 'Approval First' : 'Select bike'}</option>
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
          {selectedApp && (
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                zIndex: 1000,
              }}
              onClick={() => setSelectedApp(null)}
            >
              <div
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  width: 'min(100%, 980px)',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                  color: '#111827',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottom: '1px solid #e5e7eb' }}>
                  <h2 style={{ margin: 0, color: '#111827' }}>Application Details</h2>
                  <button onClick={() => setSelectedApp(null)} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Last Name</div>
                      <div style={{ fontWeight: 600 }}>{selectedApp.lastName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>First Name</div>
                      <div style={{ fontWeight: 600 }}>{selectedApp.firstName}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Middle Name</div>
                      <div>{selectedApp.middleName || '-'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>SR Code</div>
                      <div>{selectedApp.srCode || '-'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Sex</div>
                      <div>{selectedApp.sex || '-'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Date of Birth</div>
                      <div>{formatDate(selectedApp.dateOfBirth)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Phone Number</div>
                      <div>{selectedApp.phoneNumber || '-'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>Email Address</div>
                      <div>{selectedApp.email}</div>
                    </div>
                  </div>

                  <div style={{ gridColumn: '1 / -1', height: 1, background: '#e5e7eb', margin: '8px 0' }} />

                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>College/Program</div>
                    <div>{selectedApp.collegeProgram || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>GWA Last Semester</div>
                    <div>{selectedApp.gwaLastSemester || '-'}</div>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Extracurricular Activities</div>
                    <div>{selectedApp.extracurricularActivities || '-'}</div>
                  </div>

                  <div style={{ gridColumn: '1 / -1', height: 1, background: '#e5e7eb', margin: '8px 0' }} />

                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>House No.</div>
                    <div>{selectedApp.houseNo || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Street</div>
                    <div>{selectedApp.streetName || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Barangay</div>
                    <div>{selectedApp.barangay || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Municipality</div>
                    <div>{selectedApp.municipality || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Province</div>
                    <div>{selectedApp.province || '-'}</div>
                  </div>

                  <div style={{ gridColumn: '1 / -1', height: 1, background: '#e5e7eb', margin: '8px 0' }} />

                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Distance from Campus</div>
                    <div>{selectedApp.distanceFromCampus || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Monthly Family Income</div>
                    <div>{selectedApp.familyIncome || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Intended Duration</div>
                    <div>{selectedApp.intendedDuration || '-'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Intended Duration (Other)</div>
                    <div>{selectedApp.intendedDurationOther || '-'}</div>
                  </div>

                  {selectedApp.certificatePath && (
                    <div style={{ gridColumn: '1 / -1', marginTop: 12 }}>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Certificate of Indigency</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <img src={selectedApp.certificatePath} alt="Certificate" style={{ maxHeight: 200, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                        <a href={selectedApp.certificatePath} target="_blank" rel="noreferrer" style={{ color: '#1976d2', fontWeight: 600 }}>Open in new tab</a>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {selectedApp.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(selectedApp.id, 'approved')}
                          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <div style={{ marginLeft: 8, color: '#6b7280', fontSize: 14 }}>
                      Status: <span style={{ fontWeight: 700, color: selectedApp.status === 'approved' ? '#22c55e' : selectedApp.status === 'rejected' ? '#ef4444' : '#6b7280' }}>{selectedApp.status}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedApp(null)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#1976d2', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Back
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 