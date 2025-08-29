"use client";
import { useState } from "react";

function Icon({ type }: { type: string }) {
  if (type === "mail") {
    return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>;
  }
  return null;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

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
    const res = await fetch("/api/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (res.ok) {
      setSuccess("If this email is registered, a reset link has been sent.");
    } else {
      setError("Failed to send reset email. Try again later.");
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
          .forgot-flex-container {
            justify-content: center !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .auth-left-logo { display: none !important; }
        }
      `}</style>
      <div
        className="forgot-flex-container"
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
              <h2 style={{ margin: "18px 0 18px 0", fontWeight: 500, color: "#222" }}>Forgot Password</h2>
              <form onSubmit={handleSubmit}>
            <div style={inputGroupStyle}>
              <div style={iconBoxStyle}><Icon type="mail" /></div>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
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
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
              {error && <p style={{ color: "#b22222", margin: 0, marginBottom: 8 }}>{error}</p>}
              {success && <p style={{ color: "green", margin: 0, marginBottom: 8 }}>{success}</p>}
              <div style={{ textAlign: "center", fontSize: 15, marginTop: 8, color: "#222" }}>
                Remembered your password?{' '}
                <a href="/" style={{ color: "#1976d2", textDecoration: "underline", fontWeight: 500 }}>Sign In</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 