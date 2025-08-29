"use client";
import { useState } from "react";

const roles = [
  { value: "", label: "Select your role" },
  { value: "student", label: "Student" },
  { value: "teaching_staff", label: "Teaching Staff" },
  { value: "non_teaching_staff", label: "Non-Teaching Staff" },
];

function Icon({ type }: { type: string }) {
  // SVGs for user, mail, lock, gift, and eye
  switch (type) {
    case "user":
      return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 16-4 16 0"/></svg>;
    case "mail":
      return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>;
    case "lock":
      return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="8" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case "gift":
      return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="12" rx="2"/><path d="M12 7v12M2 11h20"/><circle cx="7.5" cy="5.5" r="2.5"/><circle cx="16.5" cy="5.5" r="2.5"/></svg>;
    case "eye":
      return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "eye-off":
      return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.77 21.77 0 0 1 5.06-6.06M1 1l22 22"/><path d="M9.53 9.53A3.5 3.5 0 0 0 12 15.5a3.5 3.5 0 0 0 2.47-5.97"/></svg>;
    default:
      return null;
  }
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState(roles[0].value);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!fullName || !email || !password || !role) {
      setError("Please fill in all fields.");
      return;
    }
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password, role }),
    });
    let data = null;
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      data = await res.json();
    }
    if (res.ok) {
      setSuccess("Registration successful! You can now log in.");
    } else {
      setError((data && data.error) || "Registration failed");
    }
  };

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
  const selectStyle = {
    ...inputStyle,
    appearance: "none" as const,
    WebkitAppearance: "none" as const,
    MozAppearance: "none" as const,
    color: "#000",
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
          .register-flex-container {
            justify-content: center !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .auth-left-logo { display: none !important; }
        }
      `}</style>
      <div
        className="register-flex-container"
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
              <h2 style={{ margin: "18px 0 18px 0", fontWeight: 500, color: "#222" }}>Register</h2>
              <form onSubmit={handleSubmit}>
            <div style={inputGroupStyle}>
              <div style={iconBoxStyle}><Icon type="user" /></div>
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div style={inputGroupStyle}>
              <div style={iconBoxStyle}><Icon type="mail" /></div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div style={inputGroupStyle}>
              <div style={iconBoxStyle}><Icon type="lock" /></div>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
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
            <div style={inputGroupStyle}>
              <div style={iconBoxStyle}><Icon type="gift" /></div>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                required
                style={{ ...selectStyle, color: '#222' }}
              >
                {roles.map(r => (
                  <option key={r.value} value={r.value} disabled={r.value === ""}>{r.label}</option>
                ))}
              </select>
            </div>
                <button
                  type="submit"
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
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.08)"
                  }}
                >
                  Register
                </button>
              </form>
              {error && <p style={{ color: "#b22222", margin: 0, marginBottom: 8 }}>{error}</p>}
              {success && <p style={{ color: "green", margin: 0, marginBottom: 8 }}>{success}</p>}
              <div style={{ textAlign: "center", fontSize: 15, marginTop: 8, color: "#222" }}>
                Already have an account?{' '}
                <a href="/" style={{ color: "#1976d2", textDecoration: "underline", fontWeight: 500 }}>Sign In</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 