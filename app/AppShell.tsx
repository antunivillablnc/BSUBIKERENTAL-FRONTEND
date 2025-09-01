"use client";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  const isAdmin = pathname?.startsWith('/admin');
  const shouldHideNavbar = isAdmin || pathname === '/' || pathname === '/register' || pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password';

  return (
    <>
      {isAdmin ? (
        <>{children}</>
      ) : (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
          {!shouldHideNavbar && <Navbar />}
          <main style={{ flex: 1 }}>
            {children}
          </main>
          <footer style={{ background: 'var(--card-bg)', borderTop: '1px solid var(--border-color)', padding: '24px' }}>
            <div style={{ maxWidth: 1400, margin: '0 auto', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>
                © 2025 Bike Rental Website. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      )}
    </>
  );
} 