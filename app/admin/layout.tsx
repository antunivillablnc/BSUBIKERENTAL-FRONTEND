"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Notification badge and dropdown for pending applications
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingApps, setPendingApps] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await fetch("/api/admin/applications");
        const data = await res.json();
        if (data.success && Array.isArray(data.applications)) {
          const pending = data.applications.filter((app: any) => app.status === 'pending');
          setPendingCount(pending.length);
          setPendingApps(pending);
        }
      } catch {}
    }
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, []);
  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClick);
    } else {
      document.removeEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showDropdown]);

  const navItems = [
    { href: "/admin", label: "Dashboard", icon: "📊" },
    { href: "/admin/applications", label: "Applications", icon: "📋" },
    { href: "/admin/bikes", label: "Bikes", icon: "🚲" },
    { href: "/admin/rental-history", label: "Rental History", icon: "📜" },
    { href: "/admin/activity-log", label: "Activity Log", icon: "📝" },
  ];

  // Load basic user info for the logout card
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw) return;
      const u = JSON.parse(raw || '{}');
      setUserName(u.name || 'Admin');
      setUserEmail(u.email || 'admin@example.com');
      setUserPhoto(u.photo || null);
    } catch {}
  }, []);

  // Profile menu (Manage accounts / Log out)
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function closeOnOutside(e: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(e.target as Node) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(e.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    }
    if (showProfileMenu) {
      document.addEventListener('mousedown', closeOnOutside);
    } else {
      document.removeEventListener('mousedown', closeOnOutside);
    }
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, [showProfileMenu]);

  // Smoothly animate profile menu when it opens
  useEffect(() => {
    if (showProfileMenu && profileMenuRef.current) {
      const el = profileMenuRef.current;
      // Reset to initial hidden state, then animate to visible
      el.style.opacity = '0';
      el.style.transform = 'translateY(6px) scale(0.98)';
      el.style.transition = 'opacity 160ms ease, transform 160ms ease';
      // Next frame: animate in
      requestAnimationFrame(() => {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0) scale(1)';
      });
    }
  }, [showProfileMenu]);

  return (
    <div style={{ minHeight: "100vh", background: "#f7f8fa", display: "flex", flexDirection: "row" }}>
      {/* Sidebar Navigation */}
      <aside style={{
        width: 260,
        background: '#fff',
        borderRight: '1px solid #e5e7eb',
        boxShadow: '1px 0 3px rgba(0,0,0,0.05)',
        position: 'fixed',
        left: 12,
        top: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
      }}>
        {/* Brand */}
        <div style={{ padding: '16px 16px 12px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <Link href="/admin" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <img src="/spartan_logo.png" alt="Sparta Logo" style={{ width: 40, height: 40, objectFit: 'contain' }} />
              <span style={{
                color: '#b22222',
                fontWeight: 800,
                fontSize: 22,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                fontFamily: 'inherit',
                textShadow: '0 1px 2px rgba(0,0,0,0.15)'
              }}>SPARTA</span>
            </div>
          </Link>
        </div>

        {/* Notifications */}
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ color: '#334155', fontWeight: 700, fontSize: 14 }}>Notifications</div>
            <button
              ref={bellRef}
              style={{
                background: 'none',
                border: '1px solid #e5e7eb',
                padding: 6,
                cursor: 'pointer',
                borderRadius: 10,
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s',
                position: 'relative',
              }}
              aria-label="Notifications"
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
              onClick={() => setShowDropdown(v => !v)}
            >
              <svg width="22" height="22" fill="none" stroke="#b22222" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11c0-3.07-1.64-5.64-5-5.958V4a1 1 0 1 0-2 0v1.042C6.64 5.36 5 7.929 5 11v3.159c0 .538-.214 1.055-.595 1.436L3 17h5m7 0v1a3 3 0 1 1-6 0v-1m6 0H9"/>
              </svg>
              {pendingCount > 0 && !showDropdown && (
                <span style={{
                  position: 'absolute',
                  top: 4,
                  right: 4,
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: 9999,
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
                  {pendingCount}
                </span>
              )}
              {showDropdown && (
                <div
                  ref={dropdownRef}
                  style={{
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
                >
                  <div style={{ padding: '14px 18px', borderBottom: '1.5px solid #f3f4f6', fontWeight: 700, color: '#b22222', fontSize: 16 }}>
                    Pending Requests
                  </div>
                  {pendingApps.length === 0 ? (
                    <div style={{ padding: '18px', color: '#6b7280', textAlign: 'center', fontSize: 15 }}>
                      No pending requests
                    </div>
                  ) : (
                    <div style={{ maxHeight: 320, overflowY: 'auto', padding: '12px 0' }}>
                      {pendingApps.map(app => (
                        <div key={app.id} style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 12,
                          padding: '12px 18px',
                          margin: '0 8px 12px 8px',
                          background: '#f6fafd',
                          borderRadius: 12,
                          boxShadow: '0 1px 4px 0 rgba(31,38,135,0.06)',
                          border: '1px solid #e0e0e0',
                        }}>
                          <div style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: '#b6d4fa',
                            color: '#1976d2',
                            fontWeight: 800,
                            fontSize: 18,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {app.firstName?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: '#222', fontWeight: 700, fontSize: 15, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {app.firstName} {app.lastName}
                            </div>
                            <div style={{ color: '#1976d2', fontSize: 14, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {app.email}
                            </div>
                            <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 8 }}>
                              Applied: {new Date(app.createdAt).toLocaleDateString()}
                            </div>
                            <a
                              href="/admin/applications"
                              style={{
                                display: 'inline-block',
                                background: '#b22222',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: 13,
                                borderRadius: 8,
                                padding: '6px 16px',
                                textDecoration: 'none',
                                marginTop: 2,
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#a11d1d'}
                              onMouseLeave={e => e.currentTarget.style.background = '#b22222'}
                            >
                              View
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Nav Items */}
        <nav style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                textDecoration: 'none',
                padding: '10px 12px',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 700,
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: pathname === item.href ? '#1976d2' : '#111111',
                background: pathname === item.href ? '#e3f2fd' : 'transparent',
                border: pathname === item.href ? '1px solid #1976d2' : '1px solid transparent',
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div style={{ marginTop: 'auto', padding: 16, borderTop: '1px solid #f1f5f9', position: 'relative' }}>
          <button
            ref={profileButtonRef}
            onClick={() => setShowProfileMenu(v => !v)}
            aria-label="Profile menu"
            aria-haspopup="menu"
            aria-expanded={showProfileMenu}
            style={{
              width: '100%',
              background: '#0b1220',
              border: '1px solid #111827',
              color: '#f8fafc',
              borderRadius: 9999,
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                overflow: 'hidden',
                background: '#111827',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #1f2937',
              }}>
                {userPhoto ? (
                  <img src={userPhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontWeight: 800, fontSize: 14, color: '#e5e7eb' }}>{(userName || 'A').charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#f8fafc', lineHeight: 1.1 }}>{userName || 'Admin'}</div>
                <div style={{ fontWeight: 600, fontSize: 12, color: '#9ca3af' }}>{userEmail ? `@${userEmail.split('@')[0]}` : '@admin'}</div>
              </div>
            </div>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: 18, color: '#e5e7eb' }}>⋯</span>
            </div>
          </button>
          {showProfileMenu && (
            <div
              ref={profileMenuRef}
              role="menu"
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 8px)',
                left: 12,
                right: 12,
                background: '#0b1220',
                border: '1px solid #111827',
                borderRadius: 12,
                boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                overflow: 'visible',
                opacity: 0,
                transform: 'translateY(6px) scale(0.98)',
                zIndex: 1000,
              }}
            >
              <button
                role="menuitem"
                onClick={() => { setShowProfileMenu(false); router.push('/admin/users'); }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: '#e5e7eb',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#0f172a')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Manage Accounts
              </button>
              <button
                role="menuitem"
                onClick={() => { localStorage.removeItem('user'); setShowProfileMenu(false); router.push('/'); }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  color: '#fecaca',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  fontWeight: 800,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#0f172a')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Log Out
              </button>
              {/* caret shape under the menu */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  bottom: -6,
                  left: 'calc(50%)',
                  width: 12,
                  height: 12,
                  background: '#0b1220',
                  borderLeft: '1px solid #111827',
                  borderTop: '1px solid #111827',
                  transform: 'translateX(-50%) rotate(45deg)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
                }}
              />
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, marginLeft: 272 }}>
        <main style={{ flex: 1, padding: 24 }}>
          {children}
        </main>
        <footer style={{
          background: '#fff',
          borderTop: '1px solid #e5e7eb',
          padding: '24px',
          marginTop: 'auto',
        }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', textAlign: 'center' }}>
            <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
              © 2025 Bike Rental Admin Panel. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
} 