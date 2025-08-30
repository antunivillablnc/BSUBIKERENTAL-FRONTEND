"use client";
import { useEffect, useState } from "react";
import BikeLoader from "../../components/BikeLoader";

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
  gwaDocumentPath?: string | null;
  ecaDocumentPath?: string | null;
  itrDocumentPath?: string | null;

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
          <BikeLoader />
          <h2 style={{ color: '#1976d2', margin: 0 }}>Loading applications...</h2>
        </div>
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
                <div style={{ padding: 20 }}>
                  {/* Sections */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Personal</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="Last Name" value={selectedApp.lastName} bold />
                        <Field label="First Name" value={selectedApp.firstName} bold />
                        <Field label="Middle Name" value={selectedApp.middleName || '-'} />
                        <Field label="SR Code" value={selectedApp.srCode || '-'} />
                        <Field label="Sex" value={selectedApp.sex || '-'} />
                        <Field label="Date of Birth" value={formatDate(selectedApp.dateOfBirth)} />
                        <Field label="Phone" value={selectedApp.phoneNumber || '-'} />
                        <Field label="Email" value={selectedApp.email} />
                      </div>
                    </div>

                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Academic</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="College" value={(selectedApp as any).college || selectedApp.collegeProgram || '-'} />
                        <Field label="Program" value={(selectedApp as any).program || '-'} />
                      </div>
                    </div>

                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Address</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="House No." value={selectedApp.houseNo || '-'} />
                        <Field label="Street" value={selectedApp.streetName || '-'} />
                        <Field label="Barangay" value={selectedApp.barangay || '-'} />
                        <Field label="Municipality" value={selectedApp.municipality || '-'} />
                        <Field label="Province" value={selectedApp.province || '-'} />
                      </div>
                    </div>

                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Other Details</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="Distance from Campus" value={selectedApp.distanceFromCampus || '-'} />
                        <Field label="Monthly Family Income" value={selectedApp.familyIncome || '-'} />
                        <Field label="Intended Duration" value={selectedApp.intendedDuration || '-'} />
                        <Field label="Intended Duration (Other)" value={selectedApp.intendedDurationOther || '-'} />
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Documents</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                      {selectedApp.certificatePath && (
                        <DocCard title="Certificate of Indigency" url={selectedApp.certificatePath} />
                      )}
                      {selectedApp.gwaDocumentPath && (
                        <DocCard title="GWA Document" url={selectedApp.gwaDocumentPath} />
                      )}
                      {selectedApp.ecaDocumentPath && (
                        <DocCard title="ECA Proof" url={selectedApp.ecaDocumentPath} />
                      )}
                      {selectedApp.itrDocumentPath && (
                        <DocCard title="ITR" url={selectedApp.itrDocumentPath} />
                      )}
                    </div>
                  </div>
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

function Field({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      <div style={{ fontWeight: bold ? 600 as any : 400 }}>{value}</div>
    </div>
  );
}

function DocCard({ title, url }: { title: string; url: string }) {
  const isPdf = url.toLowerCase().endsWith('.pdf');
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, background: '#fff' }}>
      <div style={{ fontSize: 13, color: '#374151', fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isPdf ? (
          <iframe src={url} title={`${title} PDF`} style={{ width: '100%', height: 220, borderRadius: 8, border: '1px solid #e5e7eb' }} />
        ) : (
          <img src={url} alt={title} style={{ maxHeight: 220, borderRadius: 8, border: '1px solid #e5e7eb', objectFit: 'contain' }} />
        )}
        <a href={url} target="_blank" rel="noreferrer" style={{ color: '#1976d2', fontWeight: 700, textDecoration: 'none' }}>Open in new tab</a>
      </div>
    </div>
  );
}