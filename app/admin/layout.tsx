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

  return (
    <div style={{ minHeight: "100vh", background: "#f7f8fa", display: "flex", flexDirection: "column" }}>
      {/* Admin Navigation Header */}
      <header style={{
        background: "#fff",
        borderBottom: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
            {/* Logo/Brand */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link href="/admin" style={{ textDecoration: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <img src="/spartan_logo.png" alt="Sparta Logo" style={{ width: 48, height: 48, objectFit: 'contain', marginRight: 4 }} />
                  <span style={{
                    color: "#b22222",
                    fontWeight: 800,
                    fontSize: 28,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                    fontFamily: 'inherit',
                    textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }}>
                    SPARTA
                  </span>
                </div>
              </Link>
            </div>

            {/* Navigation */}
            <nav style={{ display: "flex", gap: 8 }}>
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    textDecoration: "none",
                    padding: "8px 16px",
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: 600,
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    color: pathname === item.href ? "#1976d2" : "#111111",
                    background: pathname === item.href ? "#e3f2fd" : "transparent",
                    border: pathname === item.href ? "1px solid #1976d2" : "1px solid transparent",
                  }}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Log Out Button and Notification */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {/* Notification Button */}
              <button
                ref={bellRef}
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
                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                onClick={() => setShowDropdown(v => !v)}
              >
                {/* Bell SVG icon */}
                <svg width="24" height="24" fill="none" stroke="#b22222" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11c0-3.07-1.64-5.64-5-5.958V4a1 1 0 1 0-2 0v1.042C6.64 5.36 5 7.929 5 11v3.159c0 .538-.214 1.055-.595 1.436L3 17h5m7 0v1a3 3 0 1 1-6 0v-1m6 0H9"/>
                </svg>
                {pendingCount > 0 && !showDropdown && (
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
                    {pendingCount}
                  </span>
                )}
                {/* Notification Dropdown */}
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
                            {/* User Initial/Avatar */}
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
              <button
                onClick={() => {
                  localStorage.removeItem('user');
                  router.push('/');
                }}
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
                onMouseEnter={e => e.currentTarget.style.background = '#a11d1d'}
                onMouseLeave={e => e.currentTarget.style.background = '#b22222'}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{
        background: "#fff",
        borderTop: "1px solid #e5e7eb",
        padding: "24px",
        marginTop: "auto",
      }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", textAlign: "center" }}>
          <p style={{ color: "#6b7280", fontSize: 14, margin: 0 }}>
            © 2025 Bike Rental Admin Panel. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
} 