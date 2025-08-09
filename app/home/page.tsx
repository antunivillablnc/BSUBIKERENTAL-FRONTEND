"use client";

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('Home read user from localStorage:', parsed);
        setUser(parsed);
      }
    }
  }, []);

  if (user && user.role === 'admin') {
    return (
      <div style={{ minHeight: '100vh', background: `url('/car-rental-app.jpg') center center / cover no-repeat fixed`, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(80,80,80,0.7)', zIndex: 0, pointerEvents: 'none' }} />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <img src="/logo-spartan.png" alt="Sparta Logo" style={{ height: 60, width: 'auto', marginBottom: 8 }} />
            <div style={{ fontWeight: 700, color: '#b22222', fontSize: 28, letterSpacing: 1, marginBottom: 0 }}>SPARTA ADMIN</div>
            <div style={{ color: '#ccc', fontWeight: 600, fontSize: 18, marginBottom: 8 }}>BATANGAS STATE UNIVERSITY - TNEU</div>
            <h1 style={{ fontSize: 44, fontWeight: 800, color: '#fff', margin: '16px 0 8px 0', textShadow: '1px 2px 8px #444' }}>Admin Home</h1>
            <p style={{ fontSize: 20, color: '#eee', marginBottom: 28, textShadow: '1px 2px 8px #444' }}>
              Manage bikes, applications, and view system stats.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24 }}>
              <a href="/admin/bikes" style={{ background: '#1976d2', color: '#fff', fontWeight: 700, padding: '14px 32px', borderRadius: 8, fontSize: 18, textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>Manage Bikes</a>
              <a href="/admin/applications" style={{ background: '#22c55e', color: '#fff', fontWeight: 700, padding: '14px 32px', borderRadius: 8, fontSize: 18, textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>Manage Applications</a>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Regular user home (restored to original, always shown if not admin)
  const userName = user && user.name ? user.name : "Student";
  return (
    <div style={{
      minHeight: '100vh',
      background: `url('/car-rental-app.jpg') center center / cover no-repeat fixed`,
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
    }}>
      {/* Overlay for darkening the background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(80,80,80,0.7)',
        zIndex: 0,
        pointerEvents: 'none',
      }} />

      {/* Hero Section */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 0', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <img src="/logo-spartan.png" alt="Sparta Logo" style={{ height: 60, width: 'auto', marginBottom: 8 }} />
          <div style={{ fontWeight: 700, color: '#b22222', fontSize: 28, letterSpacing: 1, marginBottom: 0 }}>SPARTA</div>
          <div style={{ color: '#ccc', fontWeight: 600, fontSize: 18, marginBottom: 8 }}>BATANGAS STATE UNIVERSITY - TNEU</div>
          <h1 style={{ fontSize: 48, fontWeight: 800, color: '#fff', margin: '16px 0 8px 0', textShadow: '1px 2px 8px #444' }}>University Bike Rental</h1>
          <p style={{ fontSize: 22, color: '#eee', marginBottom: 28, textShadow: '1px 2px 8px #444' }}>
            Sustainable, cost-free, and fun bike rentals for Batangas State University - TNEU.
          </p>
          <a href="/reserve" style={{ background: '#1976d2', color: '#fff', fontWeight: 700, padding: '16px 38px', borderRadius: 8, fontSize: 20, textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>Get Started</a>
        </div>

        {/* Features */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 40, flexWrap: 'wrap' }}>
          {/* Eco-Friendly */}
          <div style={{ background: '#f7f7f7', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '32px 28px', maxWidth: 320, minWidth: 260, textAlign: 'center' }}>
            <div style={{ fontSize: 48, color: '#388e3c', marginBottom: 8 }}>🌱</div>
            <div style={{ fontWeight: 700, fontSize: 22, color: '#388e3c', marginBottom: 8 }}>Eco-Friendly</div>
            <div style={{ color: '#555', fontSize: 17 }}>
              Reduce your carbon footprint and help keep our campus green by choosing bikes over cars.
            </div>
          </div>
          {/* Affordable */}
          <div style={{ background: '#f7f7f7', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '32px 28px', maxWidth: 320, minWidth: 260, textAlign: 'center' }}>
            <div style={{ fontSize: 48, color: '#1976d2', marginBottom: 8 }}>💸</div>
            <div style={{ fontWeight: 700, fontSize: 22, color: '#1976d2', marginBottom: 8 }}>Cost-Free</div>
            <div style={{ color: '#555', fontSize: 17 }}>
              Enjoy zero-cost rentals designed for students and staff. No hidden fees, just easy rides.
            </div>
          </div>
          {/* Convenient */}
          <div style={{ background: '#f7f7f7', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', padding: '32px 28px', maxWidth: 320, minWidth: 260, textAlign: 'center' }}>
            <div style={{ fontSize: 48, color: '#fbc02d', marginBottom: 8 }}>📍</div>
            <div style={{ fontWeight: 700, fontSize: 22, color: '#fbc02d', marginBottom: 8 }}>Convenient</div>
            <div style={{ color: '#555', fontSize: 17 }}>
              Pick up and return bikes at multiple campus locations. Fast, simple, and always available.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 