"use client";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Navbar from "./Navbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine auth-protected routes
  const isAdmin = pathname?.startsWith('/admin');
  const protectedPaths = useMemo(() => ['/home', '/reserve', '/dashboard', '/my-bike'], []);
  const isProtected = useMemo(() => {
    if (!pathname) return false;
    return isAdmin || protectedPaths.some(p => pathname === p || pathname.startsWith(p + '/'));
  }, [pathname, isAdmin, protectedPaths]);

  // Client-side guard: redirect unauthenticated users away from protected pages
  useEffect(() => {
    if (!mounted) return;
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      if (!raw && isProtected) {
        window.location.replace('/');
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, isProtected, mounted]);

  // Handle BFCache: if user logged out and navigates back, force redirect
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if ((e as any).persisted) {
        try {
          const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
          if (!raw && isProtected) {
            window.location.replace('/');
          }
        } catch {}
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pageshow', onPageShow as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('pageshow', onPageShow as any);
      }
    };
  }, [isProtected]);

  // Don't render anything until mounted to prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

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
          <footer style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '24px' }}>
            <div style={{ maxWidth: 1400, margin: '0 auto', textAlign: 'center' }}>
              <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
                © 2025 Bike Rental Website. All rights reserved.
              </p>
            </div>
          </footer>
        </div>
      )}
    </>
  );
} 