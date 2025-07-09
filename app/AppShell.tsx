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
      {!shouldHideNavbar && <Navbar />}
      {children}
    </>
  );
} 