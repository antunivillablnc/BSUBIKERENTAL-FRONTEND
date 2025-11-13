"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/api";

type Notification = {
  id: string;
  message: string;
  date: string;
  status: string;
  ts: number; // timestamp for sorting (ms since epoch)
};

type UserProfile = {
  name: string | null;
  email: string | null;
  photo: string | null;
};

// Profile Settings Form Component
function ProfileSettingsForm({ 
  userName, 
  userEmail, 
  userPhoto, 
  onUpdate 
}: { 
  userName: string | null; 
  userEmail: string | null; 
  userPhoto: string | null; 
  onUpdate: (user: UserProfile) => void; 
}) {
  const [name, setName] = useState(userName || '');
  const [email, setEmail] = useState(userEmail || '');
  const [photo, setPhoto] = useState(userPhoto || '');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState(userPhoto || '');
  const [isUploading, setIsUploading] = useState(false);
  const [isPhotoLoading, setIsPhotoLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [phase, setPhase] = useState<'edit' | 'verify'>( 'edit' );
  const [pendingEmail, setPendingEmail] = useState('');
  const [otp, setOtp] = useState('');

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Photo size must be less than 5MB');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }
      
      setError('');
      setPhotoFile(file);
      setIsPhotoLoading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
        setIsPhotoLoading(false);
      };
      reader.onerror = () => {
        setError('Failed to load photo preview');
        setIsPhotoLoading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('photo', file);
    
    try {
      const response = await apiClient.post('/upload-profile-photo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data.photoUrl;
    } catch (error) {
      throw new Error('Failed to upload photo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setIsUploading(true);

    try {
      let photoUrl = photo;
      
      if (photoFile) {
        photoUrl = await uploadPhoto(photoFile);
      }

      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();
      const originalEmail = (userEmail || '').trim().toLowerCase();

      // 1) Always update name/photo immediately (no OTP)
      try {
        await apiClient.post('/auth/profile/update-name', { name: trimmedName, photo: photoUrl });
      } catch {
        // Non-fatal for subsequent email flow; surface error but proceed
        setError('Failed to update name/photo. You can try again.');
      }

      // 2) If email changed, send OTP and switch to verify phase
      if (trimmedEmail && trimmedEmail !== originalEmail) {
        try {
          await apiClient.post('/auth/profile/send-email-otp', { newEmail: trimmedEmail });
          setPendingEmail(trimmedEmail);
          setPhase('verify');
          setInfo(`We sent a 6-digit verification code to ${trimmedEmail}. Enter it below to confirm your new email.`);
        } catch (err: any) {
          const status = err?.response?.status;
          const msg = err?.response?.data?.error || 'Failed to send verification code';
          if (status === 409) {
            setError('This email is already used by another account. Please use a different email.');
          } else {
            setError(msg);
          }
        } finally {
          setIsUploading(false);
        }
        // Do not call onUpdate yet for email; wait until verification succeeds
        return;
      }

      // Email not changed → finish immediately
      onUpdate({
        name: trimmedName,
        email: trimmedEmail || originalEmail,
        photo: photoUrl,
      });
    } catch (error) {
      setError('Failed to update profile. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Profile Photo Section */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: 100, 
          height: 100, 
          borderRadius: '50%', 
          background: photoPreview ? 'transparent' : 'var(--accent-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px',
          overflow: 'hidden',
          border: '3px solid var(--border-color)',
        }}>
          {isPhotoLoading ? (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '100%',
              height: '100%'
            }}>
              <div style={{
                width: 24,
                height: 24,
                border: '3px solid rgba(255,255,255,0.3)',
                borderTop: '3px solid #fff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            </div>
          ) : photoPreview ? (
            <img 
              src={photoPreview} 
              alt="Profile Preview" 
              style={{ 
                width: '100%', 
                height: '100%', 
                objectFit: 'cover',
                borderRadius: '50%'
              }} 
            />
          ) : (
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 36 }}>
              {name ? name.charAt(0).toUpperCase() : 'U'}
            </span>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <label style={{
            display: 'inline-block',
            background: 'var(--accent-color)',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            transition: 'background-color 0.3s ease',
          }}>
            📷 Upload Photo
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
          </label>
          
          {photoPreview && (
            <button
              type="button"
              onClick={() => {
                setPhotoFile(null);
                setPhotoPreview('');
                setPhoto('');
              }}
              style={{
                background: '#ef4444',
                color: '#fff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: 8,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                transition: 'background-color 0.3s ease',
              }}
            >
              🗑️ Remove
            </button>
          )}
        </div>
      </div>

      {/* Name Field */}
      <div>
        <label style={{
          display: 'block',
          color: 'var(--text-primary)',
          fontWeight: 600,
          marginBottom: 8,
          fontSize: 14,
        }}>
          Full Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            fontSize: 14,
            transition: 'border-color 0.3s ease',
          }}
          placeholder="Enter your full name"
          required
        />
      </div>

      {/* Email Field */}
      <div>
        <label style={{
          display: 'block',
          color: 'var(--text-primary)',
          fontWeight: 600,
          marginBottom: 8,
          fontSize: 14,
        }}>
          Email Address
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: 'var(--input-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            color: 'var(--text-primary)',
            fontSize: 14,
            transition: 'border-color 0.3s ease',
          }}
          placeholder="Enter your email address"
          required
        />
      </div>

      {/* OTP Verification Phase */}
      {phase === 'verify' && (
        <div>
          <label style={{
            display: 'block',
            color: 'var(--text-primary)',
            fontWeight: 600,
            marginBottom: 8,
            fontSize: 14,
          }}>
            Verification Code
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'var(--input-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              color: 'var(--text-primary)',
              fontSize: 14,
              letterSpacing: 4,
            }}
            placeholder="Enter 6-digit code"
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              type="button"
              onClick={async () => {
                setError('');
                setInfo('');
                try {
                  if (!pendingEmail || !otp) {
                    setError('Enter the code to verify');
                    return;
                  }
                  const resp = await apiClient.post('/auth/profile/verify-email-otp', { newEmail: pendingEmail, otp });
                  const user = resp?.data?.user;
                  if (user) {
                    onUpdate({ name, email: user.email, photo });
                  } else {
                    onUpdate({ name, email: pendingEmail, photo });
                  }
                } catch (err: any) {
                  const msg = err?.response?.data?.error || 'Invalid code';
                  setError(msg);
                }
              }}
              style={{
                background: 'var(--accent-color)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Confirm Code
            </button>
            <button
              type="button"
              onClick={async () => {
                setError('');
                setInfo('');
                try {
                  await apiClient.post('/auth/profile/send-email-otp', { newEmail: pendingEmail || email.trim().toLowerCase() });
                  setInfo(`A new code has been sent to ${pendingEmail || email}.`);
                } catch (err: any) {
                  const status = err?.response?.status;
                  const msg = err?.response?.data?.error || 'Failed to resend code';
                  if (status === 409) {
                    try { alert('This email is already used by another account. Please use a different email.'); } catch {}
                  }
                  setError(msg);
                }
              }}
              style={{
                background: 'transparent',
                color: 'var(--accent-color)',
                border: '1px solid var(--accent-color)',
                borderRadius: 8,
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Resend Code
            </button>
            <button
              type="button"
              onClick={() => { setPhase('edit'); setOtp(''); setPendingEmail(''); setInfo(''); setError(''); }}
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                padding: '10px 16px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          color: '#ef4444',
          fontSize: 14,
          textAlign: 'center',
          padding: '8px 12px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: 6,
          border: '1px solid rgba(239, 68, 68, 0.2)',
        }}>
          {error}
        </div>
      )}
      {!error && info && (
        <div style={{
          color: 'var(--text-secondary)',
          fontSize: 14,
          textAlign: 'center',
          padding: '8px 12px',
          background: 'var(--bg-tertiary)',
          borderRadius: 6,
          border: '1px solid var(--border-color)',
        }}>
          {info}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isUploading}
        style={{
          background: 'var(--accent-color)',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '14px 24px',
          fontSize: 16,
          fontWeight: 600,
          cursor: isUploading ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.3s ease',
          opacity: isUploading ? 0.7 : 1,
        }}
      >
        {phase === 'verify' ? (isUploading ? 'Sending...' : 'Verify Email') : (isUploading ? 'Updating...' : 'Update Profile')}
      </button>
    </form>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [seenIdsSnapshot, setSeenIdsSnapshot] = useState<string>("");
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mobileProfileMenuOpen, setMobileProfileMenuOpen] = useState(false);
  const mobileProfileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileProfileMenuBtnRef = useRef<HTMLButtonElement | null>(null);
  

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        mobileProfileMenuOpen &&
        mobileProfileMenuRef.current &&
        !mobileProfileMenuRef.current.contains(e.target as Node) &&
        mobileProfileMenuBtnRef.current &&
        !mobileProfileMenuBtnRef.current.contains(e.target as Node)
      ) {
        setMobileProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [mobileProfileMenuOpen]);
  // Mobile sidebar sections are always expanded; no dropdown state needed

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
    if (!user?.email && !user?.id) {
      setNotifications([]);
      setLoadingNotifs(false);
      return;
    }
         setUserEmail(user.email || null);
     setUserName(user.name || null);
     setUserPhoto(user.photo || null);
     setSeenIdsSnapshot(loadSeenSnapshot(user.email || '')); 
    // Initial fetch for application-based notifications
    const query = user?.id ? `userId=${encodeURIComponent(user.id)}` : `email=${encodeURIComponent(user.email)}`;
    // Always use email for notifications to support existing data
    const notifQuery = `email=${encodeURIComponent(user.email)}`;
    const buildNotifsFromApps = (apps: any[]) => {
      const dismissed = loadDismissed(user.email || '');
      const notifs = apps
        .map((app: any) => {
          const status: string = (app?.status || '').toLowerCase();
          const isApproved = !!app?.bikeId || ['approved', 'active', 'assigned', 'assigned'].includes(status);
          const isRejected = ['rejected', 'declined'].includes(status);
          const isPending = !isApproved && !isRejected && ['pending', 'submitted', 'under review'].includes(status);
          if (!isApproved && !isPending && !isRejected) return null;
          const kind = isApproved ? 'approved' : isRejected ? 'rejected' : 'pending';
          const id = `${app.id}:${kind}`;
          if (dismissed.includes(id)) return null;
          const createdAt: string = app.createdAt || '';
          const ts = createdAt ? Date.parse(createdAt) : Date.now();
          return { id, message: isApproved ? 'Your bike rental was approved!' : isRejected ? 'Your application was rejected.' : 'Your application is pending review.', date: createdAt ? createdAt.split('T')[0] : '', status: kind, ts } as Notification;
        })
        .filter(Boolean) as Notification[];
      setNotifications(prev => {
        const merged = [...notifs, ...prev];
        const dedup = new Map(merged.map(n => [n.id, n]));
        const arr = Array.from(dedup.values());
        arr.sort((a, b) => b.ts - a.ts);
        return arr.slice(0, 50);
      });
      setLoadingNotifs(false);
    };

    apiClient.get(`/dashboard?${query}`)
      .then(response => {
        const data = response.data;
        if (data.success && Array.isArray(data.applications)) buildNotifsFromApps(data.applications); else { setNotifications([]); setLoadingNotifs(false); }
      })
      .catch(() => { setNotifications([]); setLoadingNotifs(false); });

    // Initial fetch of in-app notifications
    apiClient.get(`/notifications?${notifQuery}`)
      .then(resp => {
        const data = resp.data;
        if (data?.success && Array.isArray(data.notifications)) {
          const fromServer = data.notifications.map((n: any) => {
            const createdAt: string = n.createdAt || '';
            const ts = createdAt ? Date.parse(createdAt) : Date.now();
            return { id: n.id, message: n.message, date: (createdAt || '').split('T')[0] || '', status: String(n.status || 'info'), ts } as Notification;
          });
          setNotifications(prev => {
            const merged = [...fromServer, ...prev];
            const dedup = new Map(merged.map(n => [n.id, n]));
            const arr = Array.from(dedup.values());
            arr.sort((a, b) => b.ts - a.ts);
            return arr.slice(0, 50);
          });
        }
      })
      .catch(() => {});

    // Live updates via SSE
    // Live updates: applications
    let ev1: EventSource | null = null;
    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/dashboard/stream?${query}`;
      ev1 = new EventSource(url, { withCredentials: false } as any);
      ev1.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          if (payload?.success && Array.isArray(payload.applications)) {
            buildNotifsFromApps(payload.applications);
          }
        } catch {}
      };
      ev1.onerror = () => { /* ignore */ };
    } catch {}

    // Live updates: issue notifications
    let ev2: EventSource | null = null;
    try {
      const nurl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/notifications/stream?${notifQuery}`;
      ev2 = new EventSource(nurl, { withCredentials: false } as any);
      ev2.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          if (payload?.success && Array.isArray(payload.notifications)) {
            const fromServer = payload.notifications.map((n: any) => {
              const createdAt: string = n.createdAt || '';
              const ts = createdAt ? Date.parse(createdAt) : Date.now();
              return { id: n.id, message: n.message, date: (createdAt || '').split('T')[0] || '', status: String(n.status || 'info'), ts } as Notification[] extends Array<infer T> ? T : never;
            }) as Notification[];
            setNotifications(prev => {
              const merged = [...fromServer, ...prev];
              const dedup = new Map(merged.map(n => [n.id, n]));
              const arr = Array.from(dedup.values());
              arr.sort((a, b) => b.ts - a.ts);
              return arr.slice(0, 50);
            });
          }
        } catch {}
      };
      ev2.onerror = () => { /* ignore */ };
    } catch {}

    return () => { if (ev1) ev1.close(); if (ev2) ev2.close(); };
  }, []);

  // Load theme preference from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    } else {
      // Default to dark mode if no preference or preference is dark
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    
    // Force apply dark mode styles immediately
    if (savedTheme !== 'light') {
      document.body.style.backgroundColor = 'var(--bg-primary)';
      document.body.style.color = 'var(--text-primary)';
    }
  }, []);

  // Update navbar colors when theme changes
  useEffect(() => {
    const updateNavbarColors = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const textColor = isDark ? '#f8fafc' : '#111827';
      
      // Update all navigation links
      const navLinks = document.querySelectorAll('.navbar-links a');
      navLinks.forEach(link => {
        if (!link.classList.contains('active')) {
          (link as HTMLElement).style.color = textColor;
        }
      });
    };

    // Initial update
    updateNavbarColors();
    
    // Listen for theme changes
    const observer = new MutationObserver(updateNavbarColors);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, [isDarkMode]);

  // Toggle theme function
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    // Force re-render to update navbar colors
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  };
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
    { href: "/home", label: "Home", icon: "🏠" },
    { href: "/reserve", label: "Rent a Bike", icon: "🚲" },
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
  ];

  return (
    <>
             <header style={{
         background: 'var(--bg-primary)',
         borderBottom: '1px solid var(--border-color)',
         boxShadow: '0 1px 3px var(--shadow-color)',
         position: 'sticky',
         top: 0,
         zIndex: 100,
         transition: 'background-color 0.3s ease, border-color 0.3s ease',
       }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
          <div className="navbar-container" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', height: 64, width: '100%' }}>
            {/* Logo/Brand */}
            <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-start' }}>
              <Link href="/home" style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <img src="/spartan_logo.png" alt="Sparta Logo" style={{ width: 48, height: 48, objectFit: 'contain', marginRight: 4 }} />
                                     <span style={{
                     color: '#b22222',
                     fontWeight: 900,
                     fontSize: 30,
                     letterSpacing: 2,
                     textTransform: 'uppercase',
                     fontFamily: 'inherit',
                     textShadow: '0 1px 2px rgba(0,0,0,0.35)'
                   }}>
                     SPARTA
                   </span>
                </div>
              </Link>
            </div>

            {/* Navigation - Perfectly Centered */}
            <div className="navbar-links" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <nav style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {navLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                                                              style={{
                        textDecoration: 'none',
                        padding: '10px 14px',
                        borderRadius: 999,
                        fontSize: 15,
                        fontWeight: 700,
                        transition: 'background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.1s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        color: pathname === item.href ? 'var(--accent-color)' : 'var(--text-primary)',
                        background: pathname === item.href ? 'rgba(178,34,34,0.10)' : 'transparent',
                        border: pathname === item.href ? '1px solid rgba(178,34,34,0.35)' : '1px solid transparent',
                        textShadow: 'none',
                        letterSpacing: '0.5px',
                      }}
                                           onMouseEnter={(e) => {
                        if (pathname !== item.href) {
                          e.currentTarget.style.background = 'rgba(178,34,34,0.10)';
                          e.currentTarget.style.color = 'var(--accent-color)';
                          e.currentTarget.style.border = '1px solid rgba(178,34,34,0.35)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (pathname !== item.href) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--text-primary)';
                          e.currentTarget.style.border = '1px solid transparent';
                        }
                      }}
                  >
                    <span aria-hidden="true" style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right actions: notifications + user profile + hamburger */}
            <div className="header-actions" style={{ display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'flex-end' }}>
              {/* Mobile hamburger - moved here for right alignment */}
              {!menuOpen && (
                <button
                  className="hamburger"
                  aria-label="Open menu"
                  onClick={() => setMenuOpen(true)}
                  style={{
                    display: 'none',
                    background: 'none',
                    border: 'none',
                    fontSize: 30,
                    color: 'var(--accent-color)',
                    cursor: 'pointer',
                    padding: 0,
                    width: 40,
                    height: 40,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  &#9776;
                </button>
              )}

              {/* Notifications */}
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
                                     <svg width="24" height="24" fill="none" stroke="var(--accent-color)" strokeWidth="2" viewBox="0 0 24 24">
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
                    background: 'var(--card-bg)',
                    border: '1.5px solid var(--border-color)',
                    borderRadius: 12,
                    boxShadow: `0 8px 32px 0 var(--shadow-color)`,
                    zIndex: 1001,
                    padding: 0,
                    transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                  }}
                    onMouseEnter={() => setNotifDropdownOpen(true)}
                    onMouseLeave={() => setNotifDropdownOpen(false)}
                  >
                    <div style={{ padding: '14px 18px', borderBottom: '1.5px solid var(--border-color)', fontWeight: 700, color: 'var(--accent-color)', fontSize: 16, transition: 'border-color 0.3s ease, color 0.3s ease' }}>
                      Notifications
                    </div>
                    {loadingNotifs ? (
                      <div style={{ padding: '18px', color: 'var(--text-muted)', textAlign: 'center', fontSize: 15, transition: 'color 0.3s ease' }}>
                        Loading...
                      </div>
                    ) : latestNotifications.length === 0 ? (
                      <div style={{ padding: '18px', color: 'var(--text-muted)', textAlign: 'center', fontSize: 15, transition: 'color 0.3s ease' }}>
                        No notifications
                      </div>
                    ) : (
                      <div style={{ maxHeight: 320, overflowY: 'auto', padding: '12px 0' }}>
                        {latestNotifications.map(n => (
                          <div key={n.id} style={{
                            padding: '12px 18px',
                            margin: '0 8px 12px 8px',
                            background: 'var(--bg-secondary)',
                            borderRadius: 12,
                            boxShadow: `0 1px 4px 0 var(--shadow-color)`,
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-secondary)',
                            transition: 'background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease',
                          }}>
                            <div>{n.message}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', transition: 'color 0.3s ease' }}>{n.date}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px 14px 12px', gap: 8 }}>
                      <button style={{ background: 'none', color: '#1976d2', border: '1px solid #1976d2', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, padding: '6px 10px', transition: 'all 0.3s ease' }} onClick={() => { clearAllNotifications(); }}>Clear</button>
                      <button style={{ background: 'none', color: '#1976d2', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: 14, transition: 'all 0.3s ease' }} onClick={() => { setNotifModalOpen(true); setNotifDropdownOpen(false); }}>View all</button>
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile Dropdown */}
              <div
                style={{ position: 'relative' }}
                onMouseEnter={() => setUserDropdownOpen(true)}
                onMouseLeave={() => setUserDropdownOpen(false)}
              >
                
                                 <button
                                       style={{
                      background: 'none',
                      border: 'none',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      transition: 'background 0.15s, color 0.3s ease',
                      color: 'var(--text-primary)',
                      fontWeight: 600,
                    }}
                   aria-label="User Profile"
                 >
                                                          <div style={{
                       width: 32,
                       height: 32,
                       borderRadius: '50%',
                       background: userPhoto ? 'transparent' : 'var(--accent-color)',
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       color: '#fff',
                       fontWeight: 700,
                       fontSize: 14,
                       transition: 'background-color 0.3s ease',
                       overflow: 'hidden',
                     }}>
                     {userPhoto ? (
                       <img 
                         src={userPhoto} 
                         alt="Profile" 
                         style={{ 
                           width: '100%', 
                           height: '100%', 
                           objectFit: 'cover',
                           borderRadius: '50%'
                         }} 
                       />
                     ) : (
                       userName ? userName.charAt(0).toUpperCase() : 'U'
                     )}
                   </div>
                                       <span style={{ fontSize: 15, fontWeight: 700, transition: 'color 0.3s ease', textShadow: 'none', letterSpacing: '0.3px' }}>{userName || 'User'}</span>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ transition: 'transform 0.15s', transform: userDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                                 {userDropdownOpen && (
                   <div style={{
                     position: 'absolute',
                     top: 44,
                     right: 0,
                     minWidth: 280,
                     background: 'var(--bg-primary)',
                     border: '1px solid var(--border-color)',
                     borderRadius: 12,
                     boxShadow: `0 10px 30px var(--shadow-color)`,
                     zIndex: 1001,
                     padding: 0,
                     overflow: 'hidden',
                     transition: 'background-color 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
                   }}>
                     {/* User Info Header */}
                     <div style={{ 
                       padding: '16px 20px', 
                       borderBottom: '1px solid var(--border-color)',
                       background: 'var(--bg-secondary)',
                       transition: 'background-color 0.3s ease, border-color 0.3s ease',
                     }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{
                             width: 40,
                             height: 40,
                             borderRadius: '50%',
                             background: userPhoto ? 'transparent' : 'var(--accent-color)',
                             display: 'flex',
                             alignItems: 'center',
                             justifyContent: 'center',
                             color: '#fff',
                             fontWeight: 700,
                             fontSize: 16,
                             transition: 'background-color 0.3s ease',
                             overflow: 'hidden',
                           }}>
                           {userPhoto ? (
                             <img 
                               src={userPhoto} 
                               alt="Profile" 
                               style={{ 
                                 width: '100%', 
                                 height: '100%', 
                                 objectFit: 'cover',
                                 borderRadius: '50%'
                               }} 
                             />
                           ) : (
                             userName ? userName.charAt(0).toUpperCase() : 'U'
                           )}
                         </div>
                         <div>
                           <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 16, transition: 'color 0.3s ease' }}>
                             {userName || 'User'}
                           </div>
                           <div style={{ color: 'var(--text-muted)', fontSize: 14, transition: 'color 0.3s ease' }}>
                             {userEmail || 'No email'}
                           </div>
                         </div>
                       </div>
                     </div>
                     
                     {/* Menu Items */}
                    <div style={{ padding: '8px 0' }}>
                      {/* Rental History Button (no preview) */}
                      <Link href="/history" style={{ textDecoration: 'none' }} onClick={() => setUserDropdownOpen(false)}>
                        <button
                          style={{
                            width: '100%',
                            padding: '12px 20px',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            cursor: 'pointer',
                            transition: 'background 0.15s, color 0.3s ease',
                            fontSize: 14,
                            borderBottom: '1px solid var(--border-color)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M8 7h8M8 11h8M8 15h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"/>
                          </svg>
                          Rental History
                        </button>
                      </Link>

                       <button
                         onClick={() => setProfileModalOpen(true)}
                         style={{
                           width: '100%',
                           padding: '12px 20px',
                           background: 'none',
                           border: 'none',
                           color: 'var(--text-secondary)',
                           display: 'flex',
                           alignItems: 'center',
                           gap: 12,
                           cursor: 'pointer',
                           transition: 'background 0.15s, color 0.3s ease',
                           fontSize: 14,
                         }}
                         onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                         onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                       >
                         <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                           <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                           <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
                         </svg>
                         Profile Settings
                       </button>
                       <Link href="/help-center" style={{ textDecoration: 'none' }}>
                         <button
                           style={{
                             width: '100%',
                             padding: '12px 20px',
                             background: 'none',
                             border: 'none',
                             color: 'var(--text-secondary)',
                             display: 'flex',
                             alignItems: 'center',
                             gap: 12,
                             cursor: 'pointer',
                             transition: 'background 0.15s, color 0.3s ease',
                             fontSize: 14,
                           }}
                           onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                           onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                         >
                           <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                             <path d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                           </svg>
                           Help Center
                         </button>
                       </Link>
                       <button
                         onClick={toggleTheme}
                         style={{
                           width: '100%',
                           padding: '12px 20px',
                           background: isDarkMode ? 'var(--bg-tertiary)' : 'transparent',
                           border: 'none',
                           color: 'var(--text-secondary)',
                           display: 'flex',
                           alignItems: 'center',
                           gap: 12,
                           cursor: 'pointer',
                           transition: 'background 0.15s, color 0.3s ease',
                           fontSize: 14,
                         }}
                         onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-tertiary)'}
                         onMouseLeave={(e) => e.currentTarget.style.background = isDarkMode ? 'var(--bg-tertiary)' : 'transparent'}
                       >
                         <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                           {isDarkMode ? (
                             <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
                           ) : (
                             <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>
                           )}
                         </svg>
                         {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                       </button>
                       <button
                         onClick={async () => { 
                           try {
                             await apiClient.post('/auth/logout');
                           } catch (error) {
                             console.log('Logout error:', error);
                           }
                           // Clear localStorage
                           localStorage.removeItem('user'); 
                           // Manually clear cookies as backup
                           document.cookie = 'auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                           document.cookie = 'role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                           window.location.href = '/'; 
                         }}
                         style={{
                           width: '100%',
                           padding: '12px 20px',
                           background: 'var(--accent-color)',
                           border: 'none',
                           color: '#fff',
                           display: 'flex',
                           alignItems: 'center',
                           gap: 12,
                           cursor: 'pointer',
                           transition: 'background 0.15s',
                           fontSize: 14,
                           fontWeight: 600,
                         }}
                         onMouseEnter={(e) => e.currentTarget.style.background = 'var(--accent-hover)'}
                         onMouseLeave={(e) => e.currentTarget.style.background = 'var(--accent-color)'}
                       >
                         <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                           <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                         </svg>
                         Sign Out
                       </button>
                     </div>
                   </div>
                 )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hamburger icon moved inside header for mobile */}

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
              background: 'var(--card-bg)',
              width: '80vw',
              maxWidth: 320,
              height: '100vh',
              padding: '24px 20px',
              boxShadow: `2px 0 16px var(--shadow-color)`,
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              borderRight: '1px solid var(--border-color)',
              gap: 12,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button removed */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8, marginBottom: 8 }}>
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
              <button
                style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 10, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' }}
                onClick={() => setNotifModalOpen(true)}
                aria-label="Open notifications"
              >
                <svg width="18" height="18" fill="none" stroke="var(--accent-color)" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11c0-3.07-1.64-5.64-5-5.958V4a1 1 0 1 0-2 0v1.042C6.64 5.36 5 7.929 5 11v3.159c0 .538-.214 1.055-.595 1.436L3 17h5m7 0v1a3 3 0 1 1-6 0v-1m6 0H9"/></svg>
                {showBadge && (
                  <span style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', borderRadius: 9999, minWidth: 16, height: 16, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{Math.min(notifications.length, 9)}</span>
                )}
              </button>
            </div>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Nav Links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 90 }}>
                {navLinks.map(link => (
                  <a
                    key={link.href}
                    href={link.href}
                    style={{
                      color: pathname === link.href ? 'var(--accent-color)' : 'var(--text-primary)',
                      fontWeight: pathname === link.href ? 800 : 700,
                      textDecoration: 'none',
                      fontSize: 16,
                      padding: '10px 12px',
                      borderRadius: 10,
                      transition: 'background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease',
                      textShadow: 'none',
                      letterSpacing: '0.2px',
                      background: pathname === link.href ? 'rgba(178,34,34,0.10)' : 'transparent',
                      border: pathname === link.href ? '1px solid rgba(178,34,34,0.35)' : '1px solid var(--border-color)',
                    }}
                    onMouseEnter={(e) => {
                      if (pathname !== link.href) {
                        e.currentTarget.style.background = 'rgba(178,34,34,0.10)';
                        e.currentTarget.style.color = 'var(--accent-color)';
                        e.currentTarget.style.border = '1px solid rgba(178,34,34,0.35)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (pathname !== link.href) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'var(--text-primary)';
                        e.currentTarget.style.border = '1px solid var(--border-color)';
                      }
                    }}
                    onClick={() => setMenuOpen(false)}
                  >
                    <span aria-hidden="true" style={{ marginRight: 10 }}>{link.icon}</span>
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>

              {/* Bottom profile chip */}
              <div style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
                <div
                  style={{ width: '100%', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 9999, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px var(--shadow-color)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                      {userPhoto ? (
                        <img src={userPhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)' }}>{(userName || 'U').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.1 }}>{userName || 'User'}</div>
                      <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-muted)' }}>{userEmail ? `@${(userEmail.split('@')[0] || 'user')}` : '@user'}</div>
                    </div>
                  </div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <button
                      ref={mobileProfileMenuBtnRef}
                      aria-label="Open profile menu"
                      onClick={(e) => { e.stopPropagation(); setMobileProfileMenuOpen(v => !v); }}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer' }}
                    >
                      ⋯
                    </button>

                    {mobileProfileMenuOpen && (
                      <div
                        ref={mobileProfileMenuRef}
                        style={{ position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, background: 'var(--bg-primary)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 12, boxShadow: '0 8px 24px var(--shadow-color)', minWidth: 220, overflow: 'hidden' }}
                      >
                        <button
                          onClick={() => { setProfileModalOpen(true); setMobileProfileMenuOpen(false); }}
                          style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '12px 14px', cursor: 'pointer', fontWeight: 700 }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          Profile Settings
                        </button>
                        <button
                          style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '12px 14px', cursor: 'pointer', fontWeight: 700 }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          Help Center
                        </button>
                        <button
                          onClick={() => { toggleTheme(); setMobileProfileMenuOpen(false); }}
                          style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '12px 14px', cursor: 'pointer', fontWeight: 700 }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-secondary)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                        >
                          {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                        </button>
                        <button
                          onClick={async () => { 
                            try {
                              await apiClient.post('/auth/logout');
                            } catch (error) {
                              console.log('Logout error:', error);
                            }
                            // Clear localStorage
                            localStorage.removeItem('user'); 
                            // Manually clear cookies as backup
                            document.cookie = 'auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                            document.cookie = 'role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                            window.location.href = '/'; 
                          }}
                          style={{ width: '100%', textAlign: 'left', background: 'var(--accent-color)', border: 'none', color: '#fff', padding: '12px 14px', cursor: 'pointer', fontWeight: 800 }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--accent-color)')}
                        >
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
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
             background: 'var(--card-bg)',
             borderRadius: 14,
             boxShadow: `0 8px 32px var(--shadow-color)`,
             minWidth: 340,
             maxWidth: '90vw',
             maxHeight: '80vh',
             overflowY: 'auto',
             padding: 24,
             position: 'relative',
             transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
           }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close button removed; click outside modal to dismiss */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
               <div style={{ fontWeight: 800, color: '#1976d2', fontSize: 22, transition: 'color 0.3s ease' }}>All Notifications</div>
               <button onClick={clearAllNotifications} style={{ background: 'none', border: '1px solid #1976d2', color: '#1976d2', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 13, padding: '6px 10px', transition: 'all 0.3s ease' }}>Clear</button>
             </div>
             {loadingNotifs ? (
               <div style={{ color: 'var(--text-muted)', padding: '8px 0', transition: 'color 0.3s ease' }}>Loading...</div>
             ) : notifications.length === 0 ? (
               <div style={{ color: 'var(--text-muted)', padding: '8px 0', transition: 'color 0.3s ease' }}>No notifications</div>
             ) : (
               notifications.map(n => (
                 <div key={n.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', transition: 'border-color 0.3s ease, color 0.3s ease' }}>
                   <div>{n.message}</div>
                   <div style={{ fontSize: 12, color: 'var(--text-muted)', transition: 'color 0.3s ease' }}>{n.date}</div>
                 </div>
               ))
             )}
          </div>
        </div>
      )}

      {/* Profile Settings Modal */}
      {profileModalOpen && (
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
          onClick={() => setProfileModalOpen(false)}
        >
          <div style={{
            background: 'var(--card-bg)',
            borderRadius: 14,
            boxShadow: `0 8px 32px var(--shadow-color)`,
            minWidth: 400,
            maxWidth: '90vw',
            maxHeight: '80vh',
            overflowY: 'auto',
            padding: 24,
            position: 'relative',
            transition: 'background-color 0.3s ease, box-shadow 0.3s ease',
          }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setProfileModalOpen(false)}
              style={{
                position: 'absolute',
                top: 12,
                right: 16,
                background: 'none',
                border: 'none',
                fontSize: 26,
                color: 'var(--accent-color)',
                cursor: 'pointer',
              }}
              aria-label="Close profile settings"
            >
              ×
            </button>
            
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: 24, marginBottom: 8 }}>Profile Settings</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Update your profile information and photo</p>
            </div>

            <ProfileSettingsForm 
              userName={userName}
              userEmail={userEmail}
              userPhoto={userPhoto}
              onUpdate={(updatedUser) => {
                // Update local state
                setUserName(updatedUser.name);
                setUserEmail(updatedUser.email);
                setUserPhoto(updatedUser.photo);
                
                // Update localStorage
                const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
                const updatedUserData = { ...currentUser, ...updatedUser };
                localStorage.setItem('user', JSON.stringify(updatedUserData));
                
                // Close modal
                setProfileModalOpen(false);
              }}
            />
          </div>
        </div>
      )}

             {/* Responsive styles */}
       <style>{`
         @media (max-width: 700px) {
           .navbar-container {
             grid-template-columns: 1fr auto !important;
           }
           .navbar-links {
             display: none !important;
           }
           .header-actions > div {
             display: none !important;
           }
           .hamburger {
             display: flex !important;
           }
         }

                   /* Dark mode styles */
          :root {
            --bg-primary: #ffffff;
            --bg-secondary: #f9fafb;
            --bg-tertiary: #f3f4f6;
            --text-primary: #111827;
            --text-secondary: #374151;
            --text-muted: #6b7280;
            --border-color: #e5e7eb;
            --shadow-color: rgba(0,0,0,0.15);
            --card-bg: #ffffff;
            --input-bg: #ffffff;
            --input-border: #d1d5db;
            --hover-bg: #f3f4f6;
            --accent-color: #b22222;
            --accent-hover: #a11d1d;
          }

          .dark {
            --bg-primary: #222831;
            --bg-secondary: #222831;
            --bg-tertiary: #222831;
            --text-primary: #f8fafc;
            --text-secondary: #e2e8f0;
            --text-muted: #94a3b8;
            --border-color: #475569;
            --shadow-color: rgba(0,0,0,0.5);
            --card-bg: #222831;
            --input-bg: #334155;
            --input-border: #475569;
            --hover-bg: #475569;
            --accent-color: #ef4444;
            --accent-hover: #dc2626;
          }

                   /* Apply theme variables to body and html */
          body, html {
            background-color: var(--bg-primary);
            color: var(--text-primary);
            transition: background-color 0.3s ease, color 0.3s ease;
          }

          /* Default dark mode for entire page */
          body {
            background-color: #222831;
            color: #f8fafc;
          }

          /* Ensure all text is readable by default */
          body * {
            color: inherit;
          }

          /* Override aggressive dark mode for better readability */
          .dark body * {
            color: unset;
          }

          /* Theme-aware components */
          .theme-aware {
            background-color: var(--bg-primary);
            color: var(--text-primary);
            border-color: var(--border-color);
            transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
          }

          /* Global dark mode styles for better readability */
          .dark body, .dark html {
            background-color: var(--bg-primary);
            color: var(--text-primary);
          }

          .dark * {
            border-color: var(--border-color);
          }

          .dark input, .dark textarea, .dark select {
            background-color: var(--input-bg);
            color: var(--text-primary);
            border-color: var(--input-border);
          }

          .dark button {
            background-color: var(--bg-secondary);
            color: var(--text-primary);
            border-color: var(--border-color);
          }

          .dark .card, .dark .container, .dark .section {
            background-color: var(--card-bg);
            color: var(--text-primary);
            border-color: var(--border-color);
          }

          /* Enhanced contrast for dark mode */
          .dark h1, .dark h2, .dark h3, .dark h4, .dark h5, .dark h6 {
            color: var(--text-primary);
          }

          .dark p, .dark span, .dark div {
            color: var(--text-secondary);
          }

          .dark a {
            color: var(--accent-color);
          }

          .dark a:hover {
            color: var(--accent-hover);
          }

          /* Apply dark mode to page elements */
          .dark {
            background-color: var(--bg-primary);
            color: var(--text-primary);
          }

          .dark main, .dark section, .dark article, .dark aside {
            background-color: var(--bg-primary);
            color: var(--text-primary);
          }

          .dark .hero, .dark .feature-card, .dark .content-area {
            background-color: var(--card-bg);
            color: var(--text-primary);
          }

          /* Ensure form elements are readable */
          .dark label, .dark legend {
            color: var(--text-primary);
          }

          .dark .form-group, .dark .input-group {
            background-color: var(--input-bg);
            color: var(--text-primary);
          }
          
          /* Spinner animation for photo loading */
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

        /* Mobile menu slide-in animation */
        @keyframes mobileSlideIn {
          0% { transform: translateX(-16px); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .mobile-menu { animation: mobileSlideIn 200ms ease forwards; }
       `}</style>
    </>
  );
} 