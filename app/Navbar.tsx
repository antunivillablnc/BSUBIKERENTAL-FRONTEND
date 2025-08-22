"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

type Notification = {
  id: string;
  message: string;
  date: string;
  status: string;
};

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [seenIdsSnapshot, setSeenIdsSnapshot] = useState<string>("");

  const dismissedKey = (email: string) => `dismissedNotifications:${email}`;
  const loadDismissed = (email: string): string[] => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(dismissedKey(email)) : null;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((x: any) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  };
  const saveDismissed = (email: string, ids: string[]) => {
    try { if (typeof window !== 'undefined') localStorage.setItem(dismissedKey(email), JSON.stringify(ids)); } catch {}
  };
  const seenKey = (email: string) => `seenNotificationIds:${email}`;
  const loadSeenSnapshot = (email: string): string => {
    try { return (typeof window !== 'undefined' ? localStorage.getItem(seenKey(email)) : '') || ''; } catch { return ''; }
  };
  const saveSeenSnapshot = (email: string, snapshot: string) => {
    try { if (typeof window !== 'undefined') localStorage.setItem(seenKey(email), snapshot); } catch {}
  };
  useEffect(() => {
    // Get user from localStorage
    const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (!userStr) {
      setNotifications([]);
      setLoadingNotifs(false);
      return;
    }
    let user;
    try {
      user = JSON.parse(userStr);
    } catch {
      setNotifications([]);
      setLoadingNotifs(false);
      return;
    }
    if (!user?.email) {
      setNotifications([]);
      setLoadingNotifs(false);
      return;
    }
    setUserEmail(user.email);
    setSeenIdsSnapshot(loadSeenSnapshot(user.email));
    // Fetch real notifications
    fetch(`/api/dashboard?email=${encodeURIComponent(user.email)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.applications)) {
          // Build one notification per application:
          // - pending if not approved yet
          // - approved if bike assigned/approved
          // Use composite IDs (<appId>:pending|approved) so dismissing pending
          // doesn't hide the later approved message.
          const dismissed = loadDismissed(user.email);
          const notifs = data.applications
            .map((app: any) => {
              const status: string = (app?.status || '').toLowerCase();
              const isApproved = !!app?.bikeId || ['approved', 'active', 'assigned', 'assigned'].includes(status);
              const isPending = !isApproved && ['pending', 'submitted', 'under review'].includes(status);
              if (!isApproved && !isPending) return null;
              const kind = isApproved ? 'approved' : 'pending';
              const id = `${app.id}:${kind}`;
              if (dismissed.includes(id)) return null;
              return {
                id,
                message: isApproved ? 'Your bike rental was approved!' : 'Your application is pending review.',
                date: app.createdAt ? app.createdAt.split('T')[0] : '',
                status: kind,
              } as Notification;
            })
            .filter(Boolean) as Notification[];
          setNotifications(notifs);
        } else {
          setNotifications([]);
        }
        setLoadingNotifs(false);
      })
      .catch(() => {
        setNotifications([]);
        setLoadingNotifs(false);
      });
  }, []);
  const latestNotifications = notifications.slice(0, 3);
  const clearAllNotifications = () => {
    if (!userEmail) {
      setNotifications([]);
      return;
    }
    const existing = loadDismissed(userEmail);
    const toDismiss = Array.from(new Set([...existing, ...notifications.map(n => n.id)]));
    saveDismissed(userEmail, toDismiss);
    setNotifications([]);
  };

  const currentIdsSnapshot = notifications.map(n => n.id).sort().join(',');
  const showBadge = notifications.length > 0 && !notifDropdownOpen && (!!currentIdsSnapshot && currentIdsSnapshot !== seenIdsSnapshot);

  const navLinks = [
    { href: "/home", label: "Home" },
    { href: "/reserve", label: "Rent a Bike" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/my-bike", label: "My Bike" },
  ];

  return (
    <>
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
            {/* Logo/Brand */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Link href="/home" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src="/spartan_logo.png" alt="Sparta Logo" style={{ width: 48, height: 48, objectFit: 'contain', marginRight: 4 }} />
                  <span style={{
                    color: '#b22222',
                    fontWeight: 800,
                    fontSize: 28,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    fontFamily: 'inherit',
                  }}>
                    SPARTA
                  </span>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <div className="navbar-links" style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <nav style={{ display: 'flex', gap: 8 }}>
                {navLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      textDecoration: 'none',
                      padding: '8px 16px',
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 600,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      color: pathname === item.href ? '#1976d2' : '#111111',
                      background: pathname === item.href ? '#e3f2fd' : 'transparent',
                      border: pathname === item.href ? '1px solid #1976d2' : '1px solid transparent',
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right actions: notifications + logout */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div
                style={{ position: 'relative' }}
                onMouseEnter={() => setNotifDropdownOpen(true)}
                onMouseLeave={() => setNotifDropdownOpen(false)}
              >
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  borderRadius: 8,
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s',
                  position: 'relative',
                }}
                aria-label="Notifications"
                onClick={() => {
                  setNotifModalOpen(true);
                  if (userEmail) {
                    const snapshot = currentIdsSnapshot;
                    saveSeenSnapshot(userEmail, snapshot);
                    setSeenIdsSnapshot(snapshot);
                  }
                }}
              >
                <svg width="24" height="24" fill="none" stroke="#b22222" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11c0-3.07-1.64-5.64-5-5.958V4a1 1 0 1 0-2 0v1.042C6.64 5.36 5 7.929 5 11v3.159c0 .538-.214 1.055-.595 1.436L3 17h5m7 0v1a3 3 0 1 1-6 0v-1m6 0H9"/>
                </svg>
                {showBadge && (
                  <span style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '50%',
                    minWidth: 18,
                    height: 18,
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 5px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                  }}>
                    {Math.min(notifications.length, 9)}
                  </span>
                )}
              </button>
              {notifDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: 44,
                  right: 0,
                  minWidth: 320,
                  background: '#fff',
                  border: '1.5px solid #e0e0e0',
                  borderRadius: 12,
                  boxShadow: '0 8px 32px 0 rgba(31,38,135,0.12)',
                  zIndex: 1001,
                  padding: 0,
                }}
                  onMouseEnter={() => setNotifDropdownOpen(true)}
                  onMouseLeave={() => setNotifDropdownOpen(false)}
                >
                  <div style={{ padding: '14px 18px', borderBottom: '1.5px solid #f3f4f6', fontWeight: 700, color: '#b22222', fontSize: 16 }}>
                    Notifications
                  </div>
                  {loadingNotifs ? (
                    <div style={{ padding: '18px', color: '#6b7280', textAlign: 'center', fontSize: 15 }}>
                      Loading...
                    </div>
                  ) : latestNotifications.length === 0 ? (
                    <div style={{ padding: '18px', color: '#6b7280', textAlign: 'center', fontSize: 15 }}>
                      No notifications
                    </div>
                  ) : (
                    <div style={{ maxHeight: 320, overflowY: 'auto', padding: '12px 0' }}>
                      {latestNotifications.map(n => (
                        <div key={n.id} style={{
                          padding: '12px 18px',
                          margin: '0 8px 12px 8px',
                          background: '#f6fafd',
                          borderRadius: 12,
                          boxShadow: '0 1px 4px 0 rgba(31,38,135,0.06)',
                          border: '1px solid #e0e0e0',
                          color: '#444',
                        }}>
                          <div>{n.message}</div>
                          <div style={{ fontSize: 12, color: '#888' }}>{n.date}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px 14px 12px', gap: 8 }}>
                    <button style={{ background: 'none', color: '#1976d2', border: '1px solid #1976d2', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, padding: '6px 10px' }} onClick={() => { clearAllNotifications(); }}>Clear</button>
                    <button style={{ background: 'none', color: '#1976d2', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14 }} onClick={() => { setNotifModalOpen(true); setNotifDropdownOpen(false); }}>View all</button>
                  </div>
                </div>
              )}
              </div>
              <button
                onClick={() => { localStorage.removeItem('user'); window.location.href = '/'; }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  fontSize: 15,
                  fontWeight: 700,
                  color: '#fff',
                  background: '#b22222',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#a11d1d')}
                onMouseLeave={e => (e.currentTarget.style.background = '#b22222')}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hamburger icon for mobile */}
      <button
        className="hamburger"
        aria-label="Open menu"
        onClick={() => setMenuOpen(true)}
        style={{
          display: 'none',
          background: 'none',
          border: 'none',
          fontSize: 32,
          marginLeft: 16,
          cursor: 'pointer',
          zIndex: 120,
        }}
      >
        &#9776;
      </button>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          className="mobile-menu-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.4)',
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="mobile-menu"
            style={{
              background: '#fff',
              width: '80vw',
              maxWidth: 320,
              height: '100vh',
              padding: '32px 24px',
              boxShadow: '2px 0 16px rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 32,
                color: '#b22222',
                position: 'absolute',
                top: 16,
                right: 16,
                cursor: 'pointer',
              }}
            >
              &times;
            </button>
            <div style={{ marginTop: 48, display: 'flex', flexDirection: 'column', gap: 28 }}>
              {navLinks.map(link => (
                <a
                  key={link.href}
                  href={link.href}
                  style={{
                    color: pathname === link.href ? '#1976d2' : '#444',
                    fontWeight: pathname === link.href ? 700 : 500,
                    textDecoration: 'none',
                    fontSize: 22,
                    padding: '8px 0',
                  }}
                  onClick={() => setMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <button style={{ background: '#b22222', color: '#fff', fontWeight: 700, border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 18, cursor: 'pointer', marginTop: 24 }} onClick={() => { localStorage.removeItem('user'); window.location.href = '/'; }}>Log Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for all notifications */}
      {notifModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0,0,0,0.25)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
          onClick={() => setNotifModalOpen(false)}
        >
          <div style={{
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 8px 32px rgba(25, 118, 210, 0.15)',
            minWidth: 340,
            maxWidth: '90vw',
            maxHeight: '80vh',
            overflowY: 'auto',
            padding: 24,
            position: 'relative',
          }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setNotifModalOpen(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 16,
                background: 'none',
                border: 'none',
                fontSize: 26,
                color: '#b22222',
                cursor: 'pointer',
              }}
              aria-label="Close notifications"
            >
              ×
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontWeight: 800, color: '#1976d2', fontSize: 22 }}>All Notifications</div>
              <button onClick={clearAllNotifications} style={{ background: 'none', border: '1px solid #1976d2', color: '#1976d2', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, padding: '6px 10px' }}>Clear</button>
            </div>
            {loadingNotifs ? (
              <div style={{ color: '#888', padding: '8px 0' }}>Loading...</div>
            ) : notifications.length === 0 ? (
              <div style={{ color: '#888', padding: '8px 0' }}>No notifications</div>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0', color: '#444' }}>
                  <div>{n.message}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{n.date}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 700px) {
          .navbar-links {
            display: none !important;
          }
          .hamburger {
            display: block !important;
          }
        }
      `}</style>
    </>
  );
} 