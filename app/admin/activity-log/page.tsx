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
            <div style={{ color: '#6b7280', textAlign: 'center', marginTop: 32, fontSize: 16 }}>
              Loading activity log...
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