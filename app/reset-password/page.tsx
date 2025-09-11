export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
import { Suspense } from "react";
import ResetPasswordForm from "./ResetPasswordForm";

function Icon({ type }: { type: string }) {
  if (type === "lock") {
    return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="8" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
  }
  if (type === "eye") {
    return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>;
  }
  if (type === "eye-off") {
    return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.77 21.77 0 0 1 5.06-6.06M1 1l22 22"/><path d="M9.53 9.53A3.5 3.5 0 0 0 12 15.5a3.5 3.5 0 0 0 2.47-5.97"/></svg>;
  }
  return null;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
      <div style={{ textAlign: 'center', marginTop: 16 }}>
        Go back to <a href="/" style={{ color: '#1976d2', textDecoration: 'underline', fontWeight: 500 }}>Sign in</a>
      </div>
    </Suspense>
  );
} 