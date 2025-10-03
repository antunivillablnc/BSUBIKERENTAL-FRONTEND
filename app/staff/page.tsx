"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * This page redirects staff users to /home
 * Staff now use the same interface as students but with a different application form
 */
export default function StaffPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to home page - staff now use the same interface as students
    router.push('/home');
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f5f5f5'
    }}>
      <p style={{ color: '#666', fontSize: 18 }}>Redirecting...</p>
    </div>
  );
} 