"use client";
import { useEffect, useState } from 'react';

export default function AdminActivityLogPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch activity logs from the API
    fetch('/api/admin/activity-log')
      .then(res => res.json())
      .then(data => {
        setActivities(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching activity logs:', error);
        setActivities([]);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ padding: '48px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', padding: 32 }}>
          <h1 style={{ color: '#b22222', fontWeight: 800, fontSize: 32, marginBottom: 32, textAlign: 'center', letterSpacing: 1 }}>
            Activity Log
          </h1>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 20 }}>
              <div className="flash-spinner" />
              <div style={{ color: '#1976d2', fontWeight: 700 }}>Loading activity log...</div>
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
          ) : (
            <>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff' }}>
            <thead>
              <tr style={{ background: '#f6fafd' }}>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#b22222' }}>Date</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#b22222' }}>Admin</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#b22222' }}>Type</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#b22222' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {activities.map((act) => (
                <tr key={act.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 10, color: '#222', fontSize: 15 }}>{new Date(act.createdAt).toLocaleString()}</td>
                  <td style={{ padding: 10, color: '#1976d2', fontWeight: 700, fontSize: 15 }}>{act.adminName}<br /><span style={{ color: '#6b7280', fontWeight: 400, fontSize: 13 }}>{act.adminEmail}</span></td>
                  <td style={{ padding: 10, color: '#b22222', fontWeight: 700, fontSize: 15 }}>{act.type}</td>
                  <td style={{ padding: 10, color: '#222', fontSize: 15 }}>{act.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {activities.length === 0 && (
            <div style={{ color: '#6b7280', textAlign: 'center', marginTop: 32, fontSize: 16 }}>
              No activity yet.
            </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
} 