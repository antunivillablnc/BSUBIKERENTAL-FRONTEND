"use client";
import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

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

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") || "";
  const router = useRouter();

  const inputGroupStyle = {
    display: "flex",
    alignItems: "center",
    background: "#f7f7f7",
    borderRadius: 6,
    border: "1px solid #ccc",
    marginBottom: 16,
    padding: 0,
    height: 48,
  } as const;
  const iconBoxStyle = {
    background: "#e9ecef",
    borderTopLeftRadius: 6,
    borderBottomLeftRadius: 6,
    width: 48,
    height: 48,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as const;
  const inputStyle = {
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 16,
    padding: "0 12px",
    flex: 1,
    height: 48,
    color: "#000",
  } as const;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const res = await fetch("/api/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (res.ok) {
      setSuccess("Password has been reset. You can now log in.");
      router.push("/login");
    } else {
      const data = await res.json();
      setError(data.error || "Failed to reset password.");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      width: "100vw",
      backgroundImage: `url('/car-rental-app.jpg')`,
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundColor: "#aaa",
      position: "relative"
    }}>
      <div style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "rgba(128,128,128,0.7)",
        zIndex: 1
      }} />
      <style>{`
        @media (max-width: 600px) {
          .reset-flex-container {
            justify-content: center !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .auth-left-logo { display: none !important; }
        }
      `}</style>
      <div
        className="reset-flex-container"
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          paddingLeft: "0",
          paddingRight: "0",
          paddingTop: "0",
        }}
      >
        <div
          style={{
            background: "#f5f5f5",
            borderRadius: 20,
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
            padding: "32px 16px 16px 16px",
            width: "100%",
            maxWidth: 780,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
          }}
        >
          <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
            <div className="auth-left-logo" style={{ flex: "0 0 350px", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
              <img src="/bsu_logo.png" alt="BSU Logo" style={{ width: "100%", maxWidth: 340, height: "auto" }} />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}>
                <img src="/spartan_logo.png" alt="Sparta Logo" style={{ width: 48, height: 48, marginRight: 10 }} />
                <div>
                  <div style={{ fontWeight: 700, color: "#b22222", fontSize: 22, letterSpacing: 1 }}>UNIVERSITY BIKE RENTAL</div>
                  <div style={{ fontSize: 14, color: "#444" }}>Rent. Ride. Return. Spartan-style.</div>
                </div>
              </div>
              <h2 style={{ margin: "18px 0 18px 0", fontWeight: 500, color: "#222" }}>Reset Password</h2>
              <form onSubmit={handleSubmit}>
            <div style={inputGroupStyle}>
              <div style={iconBoxStyle}><Icon type="lock" /></div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="New Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPassword(s => !s)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0 12px 0 0"
                }}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <Icon type={showPassword ? "eye-off" : "eye"} />
              </button>
            </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    background: "#FFD600",
                    color: "#222",
                    fontWeight: 600,
                    fontSize: 18,
                    border: "none",
                    borderRadius: 8,
                    padding: "12px 0",
                    marginBottom: 10,
                    cursor: loading ? "not-allowed" : "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
                  }}
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </button>
              </form>
              {error && <p style={{ color: "#b22222", margin: 0, marginBottom: 8 }}>{error}</p>}
              {success && (
                <>
                  <div style={{ color: "green", marginTop: 12, fontWeight: 500 }}>
                    Password has been reset. You can now log in.
                  </div>
                  <button
                    type="button"
                    style={{
                      marginTop: 16,
                      background: "#1976d2",
                      color: "#fff",
                      fontWeight: 600,
                      border: "none",
                      borderRadius: 8,
                      padding: "10px 24px",
                      fontSize: 16,
                      cursor: "pointer",
                    }}
                    onClick={() => router.push("/login")}
                  >
                    Go back to Sign in
                  </button>
                </>
              )}
              <div style={{ textAlign: "center", fontSize: 15, marginTop: 8, color: "#222" }}>
                Go back to{' '}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 