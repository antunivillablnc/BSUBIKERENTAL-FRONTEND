"use client";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      {!['/', '/register'].includes(pathname) && <Navbar />}
      {children}
    </>
  );
} 