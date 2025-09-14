"use client";
import { useState } from "react";
import styles from "./forgot-password.module.css";

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

  const inputGroupStyle = undefined as any; // replaced by CSS module
  const iconBoxStyle = undefined as any; // replaced by CSS module
  const inputStyle = undefined as any; // replaced by CSS module

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/forgot-password`, {
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
    <div className={styles.page}>
      <div className={styles.overlay} />
      <div className={styles.content}>
        <div className={styles.panel}>
          <div className={styles.row}>
            <div className={styles.leftLogo}>
              <img src="/bsu_logo.png" alt="BSU Logo" className={styles.leftLogoImg} />
            </div>
            <div className={styles.rightCol}>
              <div className={styles.brandRow}>
                <img src="/spartan_logo.png" alt="Sparta Logo" className={styles.brandLogo} />
                <div>
                  <div className={styles.brandTitle}>UNIVERSITY BIKE RENTAL</div>
                  <div className={styles.brandTagline}>Rent. Ride. Return. Spartan-style.</div>
                </div>
              </div>
              <h2 className={styles.heading}>Forgot Password</h2>
              <form onSubmit={handleSubmit}>
                <div className={styles.inputGroup}>
                  <div className={styles.iconBox}><Icon type="mail" /></div>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className={styles.input}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className={styles.submitBtn}
                >
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>
              {error && <p className={styles.error}>{error}</p>}
              {success && <p className={styles.success}>{success}</p>}
              <div className={styles.bottomText}>
                Remembered your password?{' '}
                <a href="/" className={styles.bottomLink}>Sign In</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 