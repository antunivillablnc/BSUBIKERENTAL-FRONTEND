"use client";

import { useEffect, useRef, useState } from 'react';
import BikeLoader from '../components/BikeLoader';
import DashboardMap from '../components/DashboardMap';

// Simple circular progress used by the metric cards
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
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="transparent" />
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
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>{value.toFixed(1)}</div>
        <div style={{ fontSize: 11, color: '#6b7280' }}>{max > 1000 ? 'kcal' : 'kg'}</div>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const [user, setUser] = useState<any>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user');
      if (stored) {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      }
    }
    setInitializing(false);
  }, []);

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user');
      window.location.href = '/';
    }
  };

  // Notifications state (application status updates)
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState<boolean>(false);
  const [notifError, setNotifError] = useState<string>('');
  // Text nav state (must be declared before any early returns)
  const initialPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const [activeTab, setActiveTab] = useState<'home' | 'reserve'>(initialPath.startsWith('/reserve') ? 'reserve' : 'home');
  const [hoveredTab, setHoveredTab] = useState<'home' | 'reserve' | null>(null);
  // Track previous tab to decide slide direction
  const prevTab = useRef<'home' | 'reserve'>(initialPath.startsWith('/reserve') ? 'reserve' : 'home');
  const [slideClass, setSlideClass] = useState<string>('');

  useEffect(() => {
    if (prevTab.current !== activeTab) {
      setSlideClass(activeTab === 'reserve' ? 'slide-in-right' : 'slide-in-left');
      prevTab.current = activeTab;
    }
  }, [activeTab]);

  useEffect(() => {
    let interval: any;
    async function fetchNotifications() {
      if (!user) return;
      try {
        setNotifLoading(true);
        setNotifError('');
        const userId = user.id || user.data?.user?.id;
        const email = user.email || user.data?.user?.email;
        const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
        const query = userId ? `userId=${encodeURIComponent(userId)}` : email ? `email=${encodeURIComponent(email)}` : '';
        if (!query) return;
        const res = await fetch(`${base}/dashboard?${query}`);
        const json = await res.json();
        if (!json?.success) throw new Error(json?.error || 'Failed to load updates');
        const apps: any[] = Array.isArray(json.applications) ? json.applications : [];
        const mapped = apps.slice(0, 5).map((app: any) => {
          const status = String(app.status || '').toLowerCase();
          const createdAt = app.createdAt ? new Date(app.createdAt) : new Date();
          let title = 'Application Update';
          let message = `Application status set to ${app.status}`;
          if (status === 'approved') {
            title = 'Application Approved';
            message = 'Your application has been approved. Await bike assignment.';
          } else if (status === 'assigned' || status === 'active') {
            title = 'Bike Assigned';
            const bikeName = app.bike?.name || app.bikeId || 'a bike';
            message = `You have been assigned ${bikeName}. Please check My Bike for details.`;
          } else if (status === 'rejected') {
            title = 'Application Rejected';
            message = 'Your application was rejected. You may contact admin for details.';
          } else if (status === 'completed') {
            title = 'Rental Completed';
            message = 'Your bike rental has been completed. Thank you!';
          } else if (status === 'pending') {
            title = 'Application Submitted';
            message = 'Your application is pending review.';
          }
          return { id: app.id, title, message, createdAt };
        });
        setNotifications(mapped);
      } catch (e: any) {
        setNotifError(e?.message || 'Failed to load updates');
      } finally {
        setNotifLoading(false);
      }
    }
    fetchNotifications();
    interval = setInterval(fetchNotifications, 20000);
    return () => interval && clearInterval(interval);
  }, [user]);

  // Values derived from user, used by form and UI
  const displayName = (user && (user.data?.user?.name || user.name || user.displayName)) || 'John Doe';
  const userEmail = (user && (user.data?.user?.email || user.email)) || '';

  // Mock application form state (for Reserve tab) — declared before any early returns
  const [formData, setFormData] = useState<any>({
    fullName: displayName,
    email: userEmail,
    department: '',
    staffId: '',
    purpose: '',
    startDate: '',
    durationDays: 1,
    agree: false
  });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formMessage, setFormMessage] = useState<string>('');

  useEffect(() => {
    setFormData((prev: any) => ({
      ...prev,
      fullName: prev.fullName || displayName,
      email: prev.email || userEmail
    }));
  }, [displayName, userEmail]);

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleReserveSubmit = async (e: any) => {
    e.preventDefault();
    setSubmitting(true);
    setFormMessage('');
    try {
      // Mock submission delay
      await new Promise((r) => setTimeout(r, 800));
      setFormMessage('Application submitted (mock). We will contact you via email.');
    } catch {
      setFormMessage('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (initializing) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        backgroundImage: `url('/car-rental-app.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: '#aaa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'fixed'
      }}>
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.45)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <BikeLoader />
          <div style={{ color: '#fff', fontWeight: 800, fontSize: 18, letterSpacing: 1, textShadow: '0 2px 8px rgba(0,0,0,0.45)' }}>Loading...</div>
        </div>
      </div>
    );
  }

  const rawRole = user && (user.data?.user?.role || user.user?.role || user.role);
  const normalizedRole = (rawRole || '').toString().toLowerCase().replace(/[\s-]+/g, '_');
  const roleLabel =
    normalizedRole === 'non_teaching_staff' || normalizedRole === 'non_teaching'
      ? 'Non Teaching Staff'
      : normalizedRole === 'teaching_staff' || normalizedRole === 'teaching'
      ? 'Teaching Staff'
      : (rawRole || 'Teaching Staff');

  const photoUrl = (user && (user.data?.user?.photo || user.data?.user?.photoURL || user.photo || user.avatarUrl)) || '';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s.charAt(0).toUpperCase())
    .join('') || 'U';

  // Demo metrics similar to dashboard
  const distanceKm = 15.2;
  const co2SavedKg = 1.8;
  const caloriesBurned = 450;


  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      display: 'flex',
      alignItems: 'stretch',
      justifyContent: 'stretch',
      position: 'relative'
    }}>
      {/* Fixed, non-scrolling background image */}
      <div
        aria-hidden="true"
        style={{
        position: 'fixed',
          inset: 0,
        width: '100vw',
        height: '100vh',
          backgroundImage: `url('/car-rental-app.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#aaa',
        zIndex: 0,
          pointerEvents: 'none'
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          width: '100%',
          minHeight: '100vh',
          background: 'transparent',
          display: 'grid',
          gridTemplateColumns: '1fr',
          overflow: 'visible'
        }}
      >
        {/* Left profile sidebar */}
        <aside style={{ background: '#eeeeee', padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', position: 'fixed', top: 0, alignSelf: 'start', height: '100vh', overflow: 'hidden', zIndex: 2 }}>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 220, height: 220, borderRadius: '50%', border: '8px solid #e5e5e5', overflow: 'hidden', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontWeight: 900, fontSize: 48, color: '#9ca3af' }}>{initials}</span>
              )}
            </div>
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#1f2937' }}>{displayName}</div>
              <div style={{ fontSize: 16, color: '#4b5563', marginTop: 6 }}>{roleLabel}</div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              background: '#b22222',
              color: '#ffffff',
              fontWeight: 800,
              border: 'none',
              padding: '12px 24px',
              borderRadius: 8,
              cursor: 'pointer',
              boxShadow: '0 6px 16px rgba(178,34,34,0.25)'
            }}
          >
            Log out
          </button>
        </aside>

        {/* Right content area */}
        <section style={{ padding: '28px 28px 0 28px', display: 'flex', flexDirection: 'column', gap: 20, minHeight: '100%', marginLeft: 320, scrollBehavior: 'smooth' }}>
          {/* Header with logos and title */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, width: '100%', textAlign: 'center' }}>
            <img src="/bsu_logo.png" alt="BSU" style={{ height: 80, width: 'auto' }} />
            <div style={{ fontWeight: 900, color: '#b22222', fontSize: 72, letterSpacing: 4 }}>SPARTA</div>
            <img src="/spartan_logo.png" alt="Spartan" style={{ height: 96, width: 'auto' }} />
          </div>

          {/* Large content card */}
          <div
            style={{
              background: '#f3f4f6',
              borderRadius: 16,
              border: '1px solid #e5e7eb',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-start' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#111827' }}>
                  <span>Welcome, </span>
                  <span style={{ color: '#b22222' }}>{displayName}</span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, flexWrap: 'wrap', marginTop: 6, width: '100%' }}>
                <a
                  href="/staff"
                  aria-current={activeTab === 'home' ? 'page' : undefined}
                  onClick={(e) => { e.preventDefault(); setActiveTab('home'); }}
                  onMouseEnter={() => setHoveredTab('home')}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    color: activeTab === 'home' ? '#b22222' : (hoveredTab === 'home' ? '#111827' : '#6b7280'),
                    fontWeight: 800,
                    textDecoration: 'none',
                    paddingBottom: 6,
                    transition: 'color 200ms ease, letter-spacing 200ms ease',
                    letterSpacing: activeTab === 'home' ? 0.4 : (hoveredTab === 'home' ? 0.2 : 0)
                  }}
                >
                  Home
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: activeTab === 'home' ? 3 : 2,
                      background: activeTab === 'home' ? '#b22222' : '#9ca3af',
                      borderRadius: 2,
                      transform: `scaleX(${activeTab === 'home' || (hoveredTab === 'home' && activeTab === 'reserve') ? 1 : 0})`,
                      transformOrigin: 'center',
                      transition: 'transform 240ms ease, background-color 160ms ease, height 160ms ease'
                    }}
                  />
                </a>
                <a
                  href="/reserve"
                  onClick={(e) => { e.preventDefault(); setActiveTab('reserve'); }}
                  onMouseEnter={() => setHoveredTab('reserve')}
                  onMouseLeave={() => setHoveredTab(null)}
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    color: activeTab === 'reserve' ? '#b22222' : (hoveredTab === 'reserve' ? '#111827' : '#6b7280'),
                    fontWeight: 800,
                    textDecoration: 'none',
                    paddingBottom: 6,
                    transition: 'color 200ms ease, letter-spacing 200ms ease',
                    letterSpacing: activeTab === 'reserve' ? 0.4 : (hoveredTab === 'reserve' ? 0.2 : 0)
                  }}
                >
                  Reserve
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: activeTab === 'reserve' ? 3 : 2,
                      background: activeTab === 'reserve' ? '#b22222' : '#9ca3af',
                      borderRadius: 2,
                      transform: `scaleX(${activeTab === 'reserve' || (hoveredTab === 'reserve' && activeTab === 'home') ? 1 : 0})`,
                      transformOrigin: 'center',
                      transition: 'transform 240ms ease, background-color 160ms ease, height 160ms ease'
                    }}
                  />
          </a>
        </div>

              <div key={activeTab} className={slideClass}>
              {activeTab === 'home' ? (
                <>
                  {/* Announcements above metrics */}
                  <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
                    <div style={{ fontWeight: 800, marginBottom: 6, color: '#111827' }}>Announcements</div>
                    {notifLoading && (
                      <div style={{ color: '#6b7280' }}>Loading updates…</div>
                    )}
                    {notifError && (
                      <div style={{ color: '#b91c1c' }}>{notifError}</div>
                    )}
                    {!notifLoading && !notifError && notifications.length === 0 && (
                      <div style={{ color: '#4b5563', lineHeight: 1.6 }}>
                        No announcements yet.
                      </div>
                    )}
                    {!notifLoading && notifications.length > 0 && (
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {notifications.map((n) => (
                          <li key={n.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <span style={{ width: 8, height: 8, borderRadius: 9999, marginTop: 8, background: '#22c55e' }} />
                            <div>
                              <div style={{ fontWeight: 700, color: '#111827' }}>{n.title}</div>
                              <div style={{ color: '#4b5563' }}>{n.message}</div>
                              <div style={{ fontSize: 12, color: '#9ca3af' }}>{new Date(n.createdAt).toLocaleString()}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Metrics Row */}
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <div style={{ background: '#ffffff', borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 16, minWidth: 220, flex: 1 }}>
                      <div style={{ fontSize: 28 }}>🌱</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700, color: '#475569' }}>CO₂ Saved</div>
                        <CircularProgress value={co2SavedKg} max={5} color="#22c55e" size={70} />
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 16, minWidth: 220, flex: 1 }}>
                      <div style={{ fontSize: 28 }}>🔥</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700, color: '#475569' }}>Calories Burned</div>
                        <CircularProgress value={caloriesBurned} max={1000} color="#f97316" size={70} />
                      </div>
                    </div>
                    <div style={{ background: '#ffffff', borderRadius: 16, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 16, minWidth: 220, flex: 1 }}>
                      <div style={{ fontSize: 28 }}>🚴‍♂️</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', justifyContent: 'space-between' }}>
                        <div style={{ fontWeight: 700, color: '#475569' }}>Kilometers Biked</div>
                        <CircularProgress value={distanceKm} max={25} color="#3b82f6" size={70} />
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 4 }}>
                    <DashboardMap height={360} />
                  </div>

                  <div style={{ marginTop: 'auto', color: '#6b7280', fontSize: 12 }}>
                    Tip: Always return bikes to designated racks to avoid penalties.
                  </div>
                </>
              ) : (
                <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontWeight: 800, marginBottom: 10, color: '#111827' }}>Bike Reservation - Application (Mock)</div>
                  <form onSubmit={handleReserveSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: 6 }}>Full Name</label>
                        <input type="text" required value={formData.fullName} onChange={(e) => updateField('fullName', e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', background: '#ffffff' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: 6 }}>Email</label>
                        <input type="email" required value={formData.email} onChange={(e) => updateField('email', e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', background: '#ffffff' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: 6 }}>Department</label>
                        <input type="text" value={formData.department} onChange={(e) => updateField('department', e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', background: '#ffffff' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: 6 }}>Staff ID</label>
                        <input type="text" value={formData.staffId} onChange={(e) => updateField('staffId', e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', background: '#ffffff' }} />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: 6 }}>Purpose/Reason</label>
                      <textarea rows={3} value={formData.purpose} onChange={(e) => updateField('purpose', e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', resize: 'vertical', background: '#ffffff' }} />
                    </div>

                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 180 }}>
                        <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: 6 }}>Start Date</label>
                        <input type="date" required value={formData.startDate} onChange={(e) => updateField('startDate', e.target.value)}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', background: '#ffffff' }} />
                      </div>
                      <div style={{ minWidth: 160 }}>
                        <label style={{ display: 'block', fontWeight: 700, color: '#374151', marginBottom: 6 }}>Duration (days)</label>
                        <input type="number" min={1} max={30} required value={formData.durationDays} onChange={(e) => updateField('durationDays', Number(e.target.value))}
                          style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', outline: 'none', background: '#ffffff' }} />
                      </div>
                    </div>

                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#374151' }}>
                      <input type="checkbox" checked={formData.agree} onChange={(e) => updateField('agree', e.target.checked)} />
                      <span>I agree to the terms and campus bike usage policies.</span>
                    </label>

                    {formMessage && (
                      <div style={{ color: '#065f46', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 8, padding: '10px 12px' }}>{formMessage}</div>
                    )}

                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                      <button type="button" onClick={() => setActiveTab('home')} style={{ background: '#e5e7eb', color: '#111827', fontWeight: 700, border: 'none', padding: '10px 18px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
                      <button type="submit" disabled={submitting || !formData.agree} style={{ background: '#b22222', color: '#ffffff', fontWeight: 800, border: 'none', padding: '10px 18px', borderRadius: 8, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting || !formData.agree ? 0.7 : 1 }}>{submitting ? 'Submitting…' : 'Submit Application'}</button>
                    </div>
                  </form>
                </div>
              )}
              </div>
            </div>
          </div>
          {/* Footer outside the container (but within right content area) */}
          <footer
            style={{
              marginTop: 16,
              padding: '8px 0',
              background: 'transparent',
              borderTop: 'none',
              boxShadow: 'none',
              color: '#374151',
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              flexWrap: 'wrap'
            }}
          >
            <span>© 2025</span>
            <span style={{ fontWeight: 900, color: '#b22222', letterSpacing: 0.5 }}>SPARTA</span>
            <span style={{ color: '#6b7280' }}>Bike Rental</span>
            <span style={{ color: '#d1d5db' }}>•</span>
            <span style={{ color: '#6b7280' }}>Batangas State University - TNEU</span>
          </footer>
        </section>
        </div>
    </div>
  );
} 