"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";

function Icon({ type }: { type: string }) {
  switch (type) {
    case "mail":
      return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>;
    case "lock":
      return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="8" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
    case "eye":
      return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case "eye-off":
      return <svg width="20" height="20" fill="none" stroke="#888" strokeWidth="2" viewBox="0 0 24 24"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.77 21.77 0 0 1 5.06-6.06M1 1l22 22"/><path d="M9.53 9.53A3.5 3.5 0 0 0 12 15.5a3.5 3.5 0 0 0 2.47-5.97"/></svg>;
    default:
      return null;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const recaptchaRef = useRef<ReCAPTCHA | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";
  const recaptchaTimerRef = useRef<number | null>(null);
  const [savedUser, setSavedUser] = useState<any>(null);

  const onRecaptchaChange = async (token: string | null) => {
    if (!token) {
      setIsSubmitting(false);
      return;
    }
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, recaptchaToken: token }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuccess("Login successful!");
        if (data.user) {
          console.log('Saving user to localStorage:', data.user);
          console.log('User role:', data.user.role);
          console.log('Is admin?', data.user.role === "admin");
          localStorage.setItem('user', JSON.stringify(data.user));
          setSavedUser(data.user);
          if (data.user.role === "admin") {
            console.log('Redirecting admin to /admin/applications');
            router.push("/admin/applications");
          } else {
            console.log('Redirecting user to /home');
            router.push("/home");
          }
        }
      } else {
        let data = null;
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await res.json();
        }
        setError((data && data.error) || "Login failed");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(`Login request failed: ${message}`);
    } finally {
      recaptchaRef.current?.reset();
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError("");
    setSuccess("");
    setIsSubmitting(true);
    if (!siteKey) {
      setError("reCAPTCHA not configured");
      setIsSubmitting(false);
      return;
    }
    if (recaptchaRef.current) {
      recaptchaRef.current.execute();
      if (recaptchaTimerRef.current) {
        clearTimeout(recaptchaTimerRef.current);
      }
      recaptchaTimerRef.current = window.setTimeout(() => {
        setError("reCAPTCHA timed out. Please try again.");
        setIsSubmitting(false);
        recaptchaRef.current?.reset();
      }, 20000);
    } else {
      setError("reCAPTCHA not ready. Please refresh the page.");
      setIsSubmitting(false);
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

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        backgroundImage: `url('/car-rental-app.jpg')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundColor: "#aaa",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background: "rgba(128,128,128,0.7)",
          zIndex: 1,
        }}
        />
      <style>{`
        @media (max-width: 600px) {
          .login-flex-container {
            justify-content: center !important;
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .auth-left-logo { display: none !important; }
        }
      `}</style>
      <div
        className="login-flex-container"
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
              <h2 style={{ margin: "18px 0 18px 0", fontWeight: 500, color: "#222" }}>Please Log In</h2>
              <form onSubmit={handleSubmit}>
                <div style={inputGroupStyle}>
                  <div style={iconBoxStyle}><Icon type="mail" /></div>
                  <input
                    type="text"
                    placeholder="Email"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
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
                  >
                    <Icon type={showPassword ? "eye-off" : "eye"} />
                  </button>
                </div>
                <div style={{ marginBottom: 16, display: "flex", justifyContent: "center" }}>
                  {siteKey ? (
                    <ReCAPTCHA
                      ref={recaptchaRef}
                      size="invisible"
                      sitekey={siteKey}
                      onChange={onRecaptchaChange}
                      onErrored={() => {
                        setError("reCAPTCHA failed to load. Please allow Google reCAPTCHA and try again.");
                        setIsSubmitting(false);
                      }}
                      onExpired={() => {
                        if (recaptchaTimerRef.current) {
                          clearTimeout(recaptchaTimerRef.current);
                          recaptchaTimerRef.current = null;
                        }
                        setError("reCAPTCHA expired. Please try again.");
                        setIsSubmitting(false);
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: 12, color: "#b22222" }}>reCAPTCHA not configured</div>
                  )}
                </div>
                {error && (
                  <div style={{ color: "#d32f2f", fontSize: 14, marginBottom: 16, textAlign: "center" }}>
                    {error}
                  </div>
                )}
                {success && (
                  <div style={{ color: "#2e7d32", fontSize: 14, marginBottom: 16, textAlign: "center" }}>
                    {success}
                  </div>
                )}
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    background: "#b22222",
                    color: "white",
                    border: "none",
                    borderRadius: 6,
                    padding: "12px",
                    fontSize: 16,
                    fontWeight: 500,
                    cursor: "pointer",
                    marginBottom: 16,
                  }}
                >
                  {isSubmitting ? "Signing In..." : "Sign In"}
                </button>
              </form>
              <div style={{ textAlign: "center", fontSize: 14, color: "#666" }}>
                Don't have an account?{" "}
                <a href="/register" style={{ color: "#1976d2", textDecoration: "underline" }}>
                  Sign up
                </a>
              </div>
              <div style={{ textAlign: "center", fontSize: 14, color: "#666", marginTop: 8 }}>
                <a href="/forgot-password" style={{ color: "#1976d2", textDecoration: "underline" }}>
                  Forgot password?
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 