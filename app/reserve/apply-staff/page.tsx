import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Staff Bike Rental Application - BSU Lipa Bike Rental",
  description: "Apply for bike rental as BSU Lipa teaching or non-teaching staff. Submit your staff application with department details and rental purpose.",
};

"use client";
import { useState, useEffect } from "react";
import { getApiBaseUrl } from "@/lib/apiClient";

const initialForm = {
  lastName: "",
  firstName: "",
  middleName: "",
  email: "",
  department: "",
  staffId: "",
  employeeType: "",
  purpose: "",
  startDate: "",
  durationDays: 1,
};

// Add a style object for the card
const cardStyle = {
  background: 'var(--card-bg)',
  borderRadius: 16,
  border: '1px solid var(--border-color)',
  boxShadow: '0 8px 24px var(--shadow-color)',
  padding: '40px 24px',
  maxWidth: 700,
  width: '100%',
  marginBottom: 32,
  fontFamily: 'Segoe UI, Arial, sans-serif',
} as React.CSSProperties;

const labelStyle = {
  fontWeight: 500,
  fontSize: 15,
  color: 'var(--text-secondary)',
  marginBottom: 6,
  letterSpacing: 0.05,
  display: 'block',
} as React.CSSProperties;

const inputStyle = {
  color: 'var(--text-primary)',
  background: 'var(--input-bg)',
  border: '1.5px solid var(--input-border)',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 16,
  width: '100%',
  marginBottom: 0,
  boxSizing: 'border-box',
  height: 44,
  transition: 'border 0.2s',
  outline: 'none',
  fontFamily: 'inherit',
} as React.CSSProperties;

const buttonStyle = {
  background: 'var(--accent-color)',
  color: '#fff',
  fontWeight: 600,
  fontSize: 18,
  border: 'none',
  borderRadius: 8,
  padding: '14px 0',
  width: '100%',
  marginTop: 18,
  cursor: 'pointer',
  letterSpacing: 0.1,
  transition: 'background 0.2s',
} as React.CSSProperties;

// Add a grid style for 3 columns
const grid3Style = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: 16,
  marginBottom: 18,
} as React.CSSProperties;

// Two-column grid specifically for the Required Documents section
const docGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
  marginBottom: 18,
} as React.CSSProperties;

export default function StaffBikeRentalApplication() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError("You must accept the terms and conditions to submit the application.");
      return;
    }
    setSubmitting(true);
    setError("");
    setSuccess(false);
    
    // Basic validation
    if (!form.lastName || !form.firstName || !form.email || !form.department || !form.staffId || !form.employeeType || !form.purpose || !form.startDate || !form.durationDays) {
      setError("Please fill in all required fields.");
      setSubmitting(false);
      return;
    }
    
    try {
      // Get userId from localStorage (set at login)
      let userId = undefined;
      if (typeof window !== 'undefined') {
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            userId = user.id;
          } catch {}
        }
      }
      
      const res = await fetch(`${getApiBaseUrl()}/applications/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          ...form,
          userId,
          applicationType: "staff",
        }),
      });
      
      if (res.ok) {
        setSuccess(true);
        setForm(initialForm);
      } else {
        let message = "Submission failed. Please try again.";
        try {
          const data = await res.json();
          if (data && (data.error || data.message)) {
            message = data.error || data.message;
          }
        } catch {}
        setError(message);
      }
    } catch {
      setError("Submission failed. Please try again.");
    }
    setSubmitting(false);
  };

  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', background: `url('/car-rental-app.jpg') center center / cover no-repeat fixed` }}>
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(80,80,80,0.7)', zIndex: 0, pointerEvents: 'none' }} />
        <div style={{ background: 'var(--card-bg)', borderRadius: 16, boxShadow: '0 8px 24px var(--shadow-color)', border: '1px solid var(--border-color)', padding: 40, maxWidth: 420, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h2 style={{ color: 'var(--accent-color)', fontWeight: 800, marginBottom: 18 }}>Application Submitted!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 18 }}>Thank you for applying to rent a bike. We will review your application and contact you soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: `url('/car-rental-app.jpg') center center / cover no-repeat fixed`, display: 'flex', flexDirection: 'column', position: 'relative', padding: '48px 0' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(80,80,80,0.7)', zIndex: 0, pointerEvents: 'none' }} />
      <div
        className="apply-grid"
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'flex-start',
          gap: 40,
          width: '100%',
          maxWidth: 1300,
          padding: '0 16px',
          position: 'relative',
          zIndex: 1,
          margin: '0 auto',
        }}
      >
        {/* Left: Application Form */}
        <form className="apply-form" onSubmit={handleSubmit} style={{ ...cardStyle, flex: 1, maxWidth: 700, minWidth: 320, opacity: agreed ? 1 : 0.6, pointerEvents: agreed ? 'auto' : 'none' }}>
          <h1 className="apply-title" style={{ color: 'var(--accent-color)', fontWeight: 800, fontSize: 30, marginBottom: 24, textAlign: 'center', letterSpacing: 0.2 }}>Staff Bike Rental Application</h1>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Last Name*</label>
              <input 
                name="lastName" 
                value={form.lastName} 
                onChange={handleChange} 
                required 
                style={inputStyle} 
                placeholder="Last Name" 
              />
            </div>
            <div>
              <label style={labelStyle}>First Name*</label>
              <input 
                name="firstName" 
                value={form.firstName} 
                onChange={handleChange} 
                required 
                style={inputStyle} 
                placeholder="First Name" 
              />
            </div>
            <div>
              <label style={labelStyle}>Middle Name</label>
              <input 
                name="middleName" 
                value={form.middleName} 
                onChange={handleChange} 
                style={inputStyle} 
                placeholder="Middle Name" 
              />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Email*</label>
            <input 
              type="email" 
              name="email" 
              value={form.email} 
              onChange={handleChange} 
              required 
              style={inputStyle} 
              placeholder="Email" 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Department*</label>
              <select 
                name="department" 
                value={form.department} 
                onChange={handleChange} 
                required 
                style={inputStyle}
              >
                <option value="">Select Department</option>
                <option value="College of Teacher Education (CTE)">College of Teacher Education (CTE)</option>
                <option value="College of Engineering Technology (CET)">College of Engineering Technology (CET)</option>
                <option value="College of Arts and Sciences (CAS)">College of Arts and Sciences (CAS)</option>
                <option value="College of Accountancy, Business and Economics (CABE)">College of Accountancy, Business and Economics (CABE)</option>
                <option value="College of Informatics and Computing Sciences (CICS)">College of Informatics and Computing Sciences (CICS)</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Staff ID*</label>
              <input 
                name="staffId" 
                value={form.staffId} 
                onChange={handleChange} 
                required 
                style={inputStyle} 
                placeholder="Staff ID" 
              />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Employee Type*</label>
            <select 
              name="employeeType" 
              value={form.employeeType} 
              onChange={handleChange} 
              required 
              style={inputStyle}
            >
              <option value="">Select Employee Type</option>
              <option value="Teaching Staff">Teaching Staff</option>
              <option value="Non-Teaching Staff">Non-Teaching Staff</option>
            </select>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Purpose/Reason*</label>
            <textarea 
              name="purpose" 
              value={form.purpose} 
              onChange={handleChange} 
              required 
              rows={4}
              style={{ 
                ...inputStyle, 
                height: 'auto',
                resize: 'vertical',
                fontFamily: 'inherit'
              }} 
              placeholder="Purpose/Reason" 
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Start Date*</label>
              <input 
                type="date" 
                name="startDate" 
                value={form.startDate} 
                onChange={handleChange} 
                required 
                style={{ ...inputStyle, WebkitAppearance: 'none' }} 
              />
            </div>
            <div>
              <label style={labelStyle}>Duration (days)*</label>
              <input 
                type="number" 
                name="durationDays" 
                value={form.durationDays} 
                onChange={handleChange} 
                required 
                min={1}
                style={inputStyle} 
                placeholder="Duration" 
              />
            </div>
          </div>

          {error && <div style={{ color: '#b22222', marginBottom: 14, fontWeight: 600, fontSize: 15 }}>{error}</div>}
          <button type="submit" disabled={submitting || !agreed} style={{ ...buttonStyle, background: !agreed ? '#b0b0b0' : buttonStyle.background, cursor: !agreed ? 'not-allowed' : buttonStyle.cursor }}>
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
        {/* Right: Agreement and Info */}
        <div className="agreement-section" style={{ ...cardStyle, flex: 1, maxWidth: 480, minWidth: 280, padding: '28px 18px', marginBottom: 0 }}>
          <h2 style={{ color: 'var(--accent-color)', fontWeight: 700, fontSize: 22, marginBottom: 16 }}>Rental Agreement</h2>
          <div style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 18, lineHeight: 1.7 }}>
            <p><b>By submitting this application, you agree to the following terms:</b></p>
            <ul style={{ margin: '10px 0 18px 18px', padding: 0 }}>
              <li>You will use the bike responsibly and follow all campus rules.</li>
              <li>You will return the bike in good condition at the end of the rental period.</li>
              <li>You are responsible for reporting any damage or issues immediately.</li>
              <li>Loss or damage due to negligence may result in penalties.</li>
            </ul>
            <p style={{ color: 'var(--accent-color)', fontWeight: 600, marginTop: 18, marginBottom: 0 }}>Please read all terms carefully before submitting your application.</p>
            <div style={{ marginTop: 18, marginBottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  id="agree-checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                  style={{ width: 20, height: 20, accentColor: 'var(--accent-color)', cursor: 'pointer' }}
                />
                <label htmlFor="agree-checkbox" style={{ color: 'var(--accent-color)', fontWeight: 600, fontSize: 15, cursor: 'pointer', userSelect: 'none' }}>
                  I have read and accept the terms and conditions
                </label>
              </div>
              {!agreed && <div style={{ color: '#b22222', fontWeight: 500, fontSize: 14, marginTop: 2 }}>You must accept the agreement to fill out the application.</div>}
            </div>
          </div>
          <hr style={{ margin: '24px 0', border: 'none', borderTop: '1.5px solid var(--border-color)' }} />
          <h2 style={{ color: 'var(--accent-color)', fontWeight: 700, fontSize: 20, marginBottom: 10 }}>How will the bike be maintained?</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginBottom: 16 }}>
            All bikes are regularly checked and maintained by the BSU Bike Rental team. Please report any issues immediately after your ride.
          </p>
          <h2 style={{ color: 'var(--accent-color)', fontWeight: 700, fontSize: 20, marginBottom: 10 }}>How to find your bike?</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
            After your application is approved, you will receive instructions on where to pick up your bike on campus.
          </p>
        </div>
      </div>
      <style jsx global>{`
        @media (max-width: 900px) {
          .apply-grid {
            flex-direction: column !important;
            gap: 24px !important;
            align-items: stretch !important;
            max-width: 98vw !important;
          }
          /* Ensure agreement shows before form on mobile */
          .agreement-section { order: 0 !important; }
          .apply-form { order: 1 !important; }
        }
        @media (max-width: 700px) {
          .apply-form > div[style*="grid"] { grid-template-columns: 1fr !important; }
          .apply-title { font-size: 24px !important; }
          form[style] { padding: 24px 16px !important; }
        }
        input::placeholder, textarea::placeholder, select:invalid { color: #aaa !important; opacity: 1; }
        input[type="date"] { -webkit-appearance: none !important; width: 100% !important; max-width: 100% !important; }
        select { color: var(--text-primary) !important; background: var(--input-bg) !important; border-color: var(--input-border) !important; }
        input:focus, textarea:focus, select:focus {
          border: 1.5px solid #1976d2 !important;
          background: var(--card-bg);
        }
        body, html {
          font-family: 'Segoe UI', Arial, sans-serif;
          background: transparent;
        }
      `}</style>
    </div>
  );
}

