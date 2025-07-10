"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

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
    // Fetch real notifications
    fetch(`/api/dashboard?email=${encodeURIComponent(user.email)}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.applications)) {
          // Map to notification format
          const notifs = data.applications.map((app: any) => {
            let status = 'pending';
            if (app.bikeId) status = 'approved';
            // If you add a status field, use that here
            let message = '';
            if (status === 'approved') message = 'Your bike rental was approved!';
            else message = 'Your application is pending review.';
            return {
              id: app.id,
              message,
              date: app.createdAt ? app.createdAt.split('T')[0] : '',
              status,
            };
          });
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

  const navLinks = [
    { href: "/home", label: "Home" },
    { href: "/reserve", label: "Rent a Bike" },
    { href: "/dashboard", label: "Dashboard" },
    { href: "/about", label: "About" },
  ];

  return (
    <nav style={{ background: '#fff', padding: '0 12px', display: 'flex', alignItems: 'center', height: 80, boxShadow: '0 2px 8px rgba(0,0,0,0.03)', position: 'relative', zIndex: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'transparent' }}>
        <img src="/logo-spartan.png" alt="Sparta Logo" style={{ height: 60, width: 'auto', background: 'transparent' }} />
        <span style={{ fontWeight: 700, color: '#b22222', fontSize: 22, letterSpacing: 1, marginLeft: 8, background: 'transparent' }}>SPARTA</span>
      </div>
      {/* Desktop nav links */}
      <div className="navbar-links" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40, background: 'transparent' }}>
        {navLinks.map(link => (
          <a
            key={link.href}
            href={link.href}
            style={{
              color: pathname === link.href ? '#1976d2' : '#444',
              fontWeight: pathname === link.href ? 600 : 500,
              textDecoration: 'none',
              fontSize: 18,
              background: 'transparent',
              display: 'inline-block',
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          marginLeft: 18,
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          outline: 'none',
          position: 'relative',
        }}
        tabIndex={0}
        aria-label="Notifications"
        title="Notifications"
        onMouseEnter={() => setNotifDropdownOpen(true)}
        onMouseLeave={() => setNotifDropdownOpen(false)}
        onClick={() => setNotifModalOpen(true)}
      >
        🔔
        {/* Dropdown on hover */}
        {notifDropdownOpen && (
          <div style={{
            position: 'absolute',
            top: 36,
            right: 0,
            minWidth: 260,
            background: '#fff',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            borderRadius: 10,
            zIndex: 100,
            padding: '10px 0',
            fontSize: 15,
          }}
            onMouseEnter={() => setNotifDropdownOpen(true)}
            onMouseLeave={() => setNotifDropdownOpen(false)}
          >
            <div style={{ fontWeight: 700, color: '#1976d2', padding: '0 16px 8px' }}>Notifications</div>
            {loadingNotifs ? (
              <div style={{ color: '#888', padding: '8px 16px' }}>Loading...</div>
            ) : latestNotifications.length === 0 ? (
              <div style={{ color: '#888', padding: '8px 16px' }}>No notifications</div>
            ) : (
              latestNotifications.map(n => (
                <div key={n.id} style={{ padding: '8px 16px', borderBottom: '1px solid #f0f0f0', color: '#444' }}>
                  <div>{n.message}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{n.date}</div>
                </div>
              ))
            )}
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <button style={{ background: 'none', color: '#1976d2', border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: 14 }} onClick={() => { setNotifModalOpen(true); setNotifDropdownOpen(false); }}>View all</button>
            </div>
          </div>
        )}
      </span>
      <button style={{ background: '#e0e0e0', color: '#222', fontWeight: 600, border: 'none', borderRadius: 8, padding: '8px 22px', fontSize: 16, cursor: 'pointer', marginLeft: 24, backgroundClip: 'padding-box', zIndex: 11 }} onClick={() => { localStorage.removeItem('user'); window.location.href = '/'; }}>Logout</button>
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
          zIndex: 12,
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
              <button style={{ background: '#e0e0e0', color: '#222', fontWeight: 600, border: 'none', borderRadius: 8, padding: '10px 0', fontSize: 18, cursor: 'pointer', marginTop: 24 }} onClick={() => { localStorage.removeItem('user'); window.location.href = '/'; }}>Logout</button>
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
            <div style={{ fontWeight: 800, color: '#1976d2', fontSize: 22, marginBottom: 18 }}>All Notifications</div>
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
    </nav>
  );
} 