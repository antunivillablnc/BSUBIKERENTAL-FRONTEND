"use client";
import { useState, useEffect } from "react";

const initialForm = {
  lastName: "",
  firstName: "",
  middleName: "",
  srCode: "",
  sex: "",
  dateOfBirth: "",
  phoneNumber: "",
  email: "",
  collegeProgram: "",
  college: "",
  program: "",
  gwaLastSemester: "",
  extracurricularActivities: "",
  houseNo: "",
  streetName: "",
  barangay: "",
  municipality: "",
  province: "",
  distanceFromCampus: "",
  familyIncome: "",
  intendedDuration: "",
  intendedDurationOther: "",
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

const grid4Style = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr 1fr',
  gap: 12,
  marginBottom: 18,
} as React.CSSProperties;

// Two-column grid specifically for the Required Documents section
const docGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
  marginBottom: 18,
} as React.CSSProperties;

export default function BikeRentalApplication() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [locationData, setLocationData] = useState<any>(null);
  const [provinceList, setProvinceList] = useState<string[]>([]);
  const [municipalityList, setMunicipalityList] = useState<string[]>([]);
  const [barangayList, setBarangayList] = useState<string[]>([]);
  const [agreed, setAgreed] = useState(false);
  const [indigencyFile, setIndigencyFile] = useState<File | null>(null);
  const [indigencyPreview, setIndigencyPreview] = useState<string | null>(null);
  const [gwaFile, setGwaFile] = useState<File | null>(null);
  const [gwaPreview, setGwaPreview] = useState<string | null>(null);
  const [ecaFile, setEcaFile] = useState<File | null>(null);
  const [ecaPreview, setEcaPreview] = useState<string | null>(null);
  const [itrFile, setItrFile] = useState<File | null>(null);
  const [itrPreview, setItrPreview] = useState<string | null>(null);

  useEffect(() => {
    fetch("/philippines.json")
      .then(res => res.json())
      .then(data => {
        setLocationData(data);
        let provinces: string[] = [];
        Object.values(data).forEach((region: any) => {
          provinces = provinces.concat(Object.keys(region.province_list));
        });
        setProvinceList(provinces.sort());
      });
  }, []);

  useEffect(() => {
    if (!locationData || !form.province) {
      setMunicipalityList([]);
      return;
    }
    let found = false;
    Object.values(locationData).forEach((region: any) => {
      if (region.province_list[form.province]) {
        setMunicipalityList(Object.keys(region.province_list[form.province].municipality_list).sort());
        found = true;
      }
    });
    if (!found) setMunicipalityList([]);
    setForm(f => ({ ...f, municipality: "", barangay: "" }));
  }, [form.province, locationData]);

  useEffect(() => {
    if (!locationData || !form.province || !form.municipality) {
      setBarangayList([]);
      return;
    }
    let found = false;
    Object.values(locationData).forEach((region: any) => {
      if (region.province_list[form.province]) {
        const mun = region.province_list[form.province].municipality_list[form.municipality];
        if (mun) {
          setBarangayList(mun.barangay_list.sort());
          found = true;
        }
      }
    });
    if (!found) setBarangayList([]);
    setForm(f => ({ ...f, barangay: "" }));
  }, [form.municipality, form.province, locationData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setForm(f => ({ ...f, [name]: checked ? value : "" }));
    } else if (type === "file" && name === "indigencyFile") {
      const file = (e.target as HTMLInputElement).files?.[0] || null;
      setIndigencyFile(file);
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setIndigencyPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setIndigencyPreview(null);
      }
    } else if (type === "file" && name === "gwaFile") {
      const file = (e.target as HTMLInputElement).files?.[0] || null;
      setGwaFile(file);
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setGwaPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setGwaPreview(null);
      }
    } else if (type === "file" && name === "ecaFile") {
      const file = (e.target as HTMLInputElement).files?.[0] || null;
      setEcaFile(file);
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setEcaPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setEcaPreview(null);
      }
    } else if (type === "file" && name === "itrFile") {
      const file = (e.target as HTMLInputElement).files?.[0] || null;
      setItrFile(file);
      if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setItrPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setItrPreview(null);
      }
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
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
    if (!form.lastName || !form.firstName || !form.srCode || !form.sex || !form.dateOfBirth || !form.phoneNumber || !form.email || !form.college || !form.program || !form.houseNo || !form.streetName || !form.barangay || !form.municipality || !form.province || !form.distanceFromCampus || !form.familyIncome || !form.intendedDuration) {
      setError("Please fill in all required fields.");
      setSubmitting(false);
      return;
    }
    if (!indigencyFile) {
      setError("Please upload your Certificate of Indigency.");
      setSubmitting(false);
      return;
    }
    if (!gwaFile) {
      setError("Please upload your GWA (PDF or image).");
      setSubmitting(false);
      return;
    }
    if (!ecaFile) {
      setError("Please upload your Extracurricular Activities proof (PDF or image).");
      setSubmitting(false);
      return;
    }
    if (!itrFile) {
      setError("Please upload your ITR (PDF or image).");
      setSubmitting(false);
      return;
    }
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key === "familyIncome") {
          formData.append(key, String(Number(value)));
        } else {
          formData.append(key, value);
        }
      });
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
      if (userId) {
        formData.append("userId", userId);
      }
      formData.append("indigencyFile", indigencyFile);
      formData.append("gwaFile", gwaFile);
      formData.append("ecaFile", ecaFile);
      formData.append("itrFile", itrFile);
      const res = await fetch("/api/rental-application", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setSuccess(true);
        setForm(initialForm);
        setIndigencyFile(null);
        setIndigencyPreview(null);
        setGwaFile(null);
        setGwaPreview(null);
        setEcaFile(null);
        setEcaPreview(null);
        setItrFile(null);
        setItrPreview(null);
      } else {
        setError("Submission failed. Please try again.");
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
        <form onSubmit={handleSubmit} style={{ ...cardStyle, flex: 1, maxWidth: 700, minWidth: 320, opacity: agreed ? 1 : 0.6, pointerEvents: agreed ? 'auto' : 'none' }}>
          <h1 style={{ color: 'var(--accent-color)', fontWeight: 800, fontSize: 30, marginBottom: 24, textAlign: 'center', letterSpacing: 0.2 }}>Bike Rental Application</h1>
          {/* Personal Information */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, margin: '12px 0 6px 0' }}>Personal Information</div>

          <div style={grid3Style}>
            <div>
              <label style={labelStyle}>Last Name*</label>
              <input name="lastName" value={form.lastName} onChange={handleChange} required style={inputStyle} placeholder="Last Name" />
            </div>
            <div>
              <label style={labelStyle}>First Name*</label>
              <input name="firstName" value={form.firstName} onChange={handleChange} required style={inputStyle} placeholder="First Name" />
            </div>
            <div>
              <label style={labelStyle}>Middle Name</label>
              <input name="middleName" value={form.middleName} onChange={handleChange} style={inputStyle} placeholder="Middle Name" />
            </div>
          </div>
          <div style={grid3Style}>
            <div>
              <label style={labelStyle}>SR Code*</label>
              <input name="srCode" value={form.srCode} onChange={handleChange} required style={inputStyle} placeholder="SR Code" />
            </div>
            <div>
              <label style={labelStyle}>Sex*</label>
              <select name="sex" value={form.sex} onChange={handleChange} required style={inputStyle}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>
          <div style={grid3Style}>
            <div>
              <label style={labelStyle}>Date of Birth*</label>
              <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Phone Number*</label>
              <input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} required style={inputStyle} placeholder="Phone Number" />
            </div>
            <div>
              <label style={labelStyle}>Email Address*</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required style={inputStyle} placeholder="Email Address" />
            </div>
          </div>
          <div style={grid3Style}>
            <div>
              <label style={labelStyle}>College*</label>
              <input name="college" value={form.college} onChange={handleChange} required style={inputStyle} placeholder="College" />
            </div>
            <div>
              <label style={labelStyle}>Program*</label>
              <input name="program" value={form.program} onChange={handleChange} required style={inputStyle} placeholder="Program" />
            </div>
            <div>
              <label style={labelStyle}>Section</label>
              <input name="collegeProgram" value={form.collegeProgram} onChange={handleChange} style={inputStyle} placeholder="Section" />
            </div>
          </div>

          {/* Required Documents */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, margin: '12px 0 6px 0' }}>Required Documents</div>
          <div style={docGridStyle}>
            <div>
              <label style={labelStyle}>Certificate of Indigency</label>
              <label htmlFor="indigencyFile" style={{
                ...inputStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                cursor: 'pointer',
                marginBottom: 0,
                height: 44,
                borderRadius: 8,
                fontSize: 16,
                color: indigencyFile ? 'var(--text-primary)' : 'var(--text-muted)',
                overflow: 'hidden',
                position: 'relative',
                maxWidth: 320, // Prevents the input from stretching
              }}>
                <span style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  borderRadius: 6,
                  padding: '6px 16px',
                  marginRight: 12,
                  fontSize: 15,
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}>Choose File</span>
                <span style={{ fontSize: 15, color: indigencyFile ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140, display: 'inline-block' }}>
                  {indigencyFile ? indigencyFile.name : 'No file chosen'}
                </span>
                <input
                  id="indigencyFile"
                  type="file"
                  name="indigencyFile"
                  accept="application/pdf,image/*"
                  onChange={handleChange}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                  required
                />
              </label>
            </div>
            <div>
              <label style={labelStyle}>General Weighted Average</label>
              <label htmlFor="gwaFile" style={{
                ...inputStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                cursor: 'pointer',
                marginBottom: 0,
                height: 44,
                borderRadius: 8,
                fontSize: 16,
                color: gwaFile ? 'var(--text-primary)' : 'var(--text-muted)',
                overflow: 'hidden',
                position: 'relative',
                maxWidth: 320,
              }}>
                <span style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  borderRadius: 6,
                  padding: '6px 16px',
                  marginRight: 12,
                  fontSize: 15,
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}>Choose File</span>
                <span style={{ fontSize: 15, color: gwaFile ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140, display: 'inline-block' }}>
                  {gwaFile ? gwaFile.name : 'No file chosen'}
                </span>
                <input
                  id="gwaFile"
                  type="file"
                  name="gwaFile"
                  accept="application/pdf,image/*"
                  onChange={handleChange}
                  style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                  required
                />
              </label>
            </div>
            <div>
              <label style={labelStyle}>Extra Curricular Activities</label>
              <label htmlFor="ecaFile" style={{
                ...inputStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                cursor: 'pointer',
                marginBottom: 0,
                height: 44,
                borderRadius: 8,
                fontSize: 16,
                color: ecaFile ? 'var(--text-primary)' : 'var(--text-muted)',
                overflow: 'hidden',
                position: 'relative',
                maxWidth: 320,
              }}>
                <span style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  borderRadius: 6,
                  padding: '6px 16px',
                  marginRight: 12,
                  fontSize: 15,
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}>Choose File</span>
                <span style={{ fontSize: 15, color: ecaFile ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140, display: 'inline-block' }}>
                  {ecaFile ? ecaFile.name : 'No file chosen'}
                </span>
                <input
                  id="ecaFile"
                  type="file"
                  name="ecaFile"
                  accept="application/pdf,image/*"
                  onChange={handleChange}
                  style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                  required
                />
              </label>
            </div>
            <div>
              <label style={labelStyle}>Income Tax Return</label>
              <label htmlFor="itrFile" style={{
                ...inputStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                cursor: 'pointer',
                marginBottom: 0,
                height: 44,
                borderRadius: 8,
                fontSize: 16,
                color: itrFile ? 'var(--text-primary)' : 'var(--text-muted)',
                overflow: 'hidden',
                position: 'relative',
                maxWidth: 320,
              }}>
                <span style={{
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  borderRadius: 6,
                  padding: '6px 16px',
                  marginRight: 12,
                  fontSize: 15,
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}>Choose File</span>
                <span style={{ fontSize: 15, color: itrFile ? 'var(--text-primary)' : 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140, display: 'inline-block' }}>
                  {itrFile ? itrFile.name : 'No file chosen'}
                </span>
                <input
                  id="itrFile"
                  type="file"
                  name="itrFile"
                  accept="application/pdf,image/*"
                  onChange={handleChange}
                  style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                  required
                />
              </label>
            </div>
          </div>
          
          {/* Documents consolidated under Required Documents section above */}
          {/* Address */}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, margin: '12px 0 6px 0' }}>Present Home Address</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 12,
            marginBottom: 12,
          }}>
            <div>
              <input name="houseNo" value={form.houseNo} onChange={handleChange} required placeholder="House No." style={inputStyle} />
            </div>
            <div>
              <input name="streetName" value={form.streetName} onChange={handleChange} required placeholder="Street Name" style={inputStyle} />
            </div>
            <div>
              <select name="province" value={form.province} onChange={handleChange} required style={inputStyle}>
                <option value="">Select Province</option>
                {provinceList.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
            marginBottom: 18,
          }}>
            <div>
              <select name="municipality" value={form.municipality} onChange={handleChange} required style={inputStyle} disabled={!form.province}>
                <option value="">Select Municipality/City</option>
                {municipalityList.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <select name="barangay" value={form.barangay} onChange={handleChange} required style={inputStyle} disabled={!form.municipality}>
                <option value="">Select Barangay</option>
                {barangayList.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
            <div style={{ flex: 2, minWidth: 140 }}>
              <label style={labelStyle}>Distance from Campus*</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 15, color: 'var(--text-secondary)', marginTop: 4 }}>
                <label><input type="radio" name="distanceFromCampus" value="<1km" checked={form.distanceFromCampus === "<1km"} onChange={handleChange} required /> Less than 1 km</label>
                <label><input type="radio" name="distanceFromCampus" value="1-5km" checked={form.distanceFromCampus === "1-5km"} onChange={handleChange} required /> 1 km but less than 5 km</label>
                <label><input type="radio" name="distanceFromCampus" value=">=5km" checked={form.distanceFromCampus === ">=5km"} onChange={handleChange} required /> 5 km and above</label>
              </div>
            </div>
            <div style={{ flex: 2, minWidth: 140 }}>
              <label style={labelStyle}>Monthly Family Income*</label>
              <input name="familyIncome" value={form.familyIncome} onChange={handleChange} required style={inputStyle} placeholder="Monthly Family Income" />
            </div>
            <div style={{ flex: 2, minWidth: 140 }}>
              <label style={labelStyle}>Intended Duration of Use*</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 15, color: 'var(--text-secondary)', marginTop: 4 }}>
                <label><input type="radio" name="intendedDuration" value="One Semester" checked={form.intendedDuration === "One Semester"} onChange={handleChange} required /> One Semester</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <input type="radio" name="intendedDuration" value="Others" checked={form.intendedDuration === "Others"} onChange={handleChange} required />
                  Others:
                  <input name="intendedDurationOther" value={form.intendedDurationOther} onChange={handleChange} style={{ ...inputStyle, width: 120 }} disabled={form.intendedDuration !== "Others"} placeholder="Specify" />
                </label>
              </div>
            </div>
          </div>
          {error && <div style={{ color: '#b22222', marginBottom: 14, fontWeight: 600, fontSize: 15 }}>{error}</div>}
          <button type="submit" disabled={submitting || !agreed} style={{ ...buttonStyle, background: !agreed ? '#b0b0b0' : buttonStyle.background, cursor: !agreed ? 'not-allowed' : buttonStyle.cursor }}>
            {submitting ? "Submitting..." : "Submit Application"}
          </button>
        </form>
        {/* Right: Agreement and Info */}
        <div style={{ ...cardStyle, flex: 1, maxWidth: 480, minWidth: 280, padding: '28px 18px', marginBottom: 0 }}>
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
          div[style*='display: flex'][style*='flex-direction: row'] {
            flex-direction: column !important;
            gap: 24px !important;
            align-items: stretch !important;
            max-width: 98vw !important;
          }
        }
        input::placeholder, select:invalid { color: #aaa !important; opacity: 1; }
        select { color: var(--text-primary) !important; background: var(--input-bg) !important; border-color: var(--input-border) !important; }
        input:focus, select:focus {
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