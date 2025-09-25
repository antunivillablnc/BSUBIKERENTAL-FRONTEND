"use client";
import { useEffect, useState } from "react";
import BikeLoader from "../../components/BikeLoader";
import jsPDF from 'jspdf';
import Papa from 'papaparse';

interface Application {
  id: string;
  // Basic identity
  lastName: string;
  firstName: string;
  middleName?: string | null;
  srCode?: string;
  sex?: string;
  dateOfBirth?: string;

  // Contact
  phoneNumber?: string;
  email: string;

  // Academic
  collegeProgram?: string;
  college?: string;
  program?: string;
  section?: string;
  gwaLastSemester?: string;
  extracurricularActivities?: string | null;

  // Address
  houseNo?: string;
  streetName?: string;
  barangay?: string;
  municipality?: string;
  province?: string;

  // Other details
  distanceFromCampus?: string;
  familyIncome?: string;
  intendedDuration?: string;
  intendedDurationOther?: string | null;
  certificatePath?: string | null;
  gwaDocumentPath?: string | null;
  ecaDocumentPath?: string | null;
  itrDocumentPath?: string | null;

  // Status / relations
  status: string;
  bikeId?: string | null;
  bike?: { id: string; name: string } | null;
  createdAt: string;
}

interface Bike {
  id: string;
  name: string;
  status: string;
}

export default function AdminApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [bikes, setBikes] = useState<Bike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assigning, setAssigning] = useState<string | null>(null);
  const [assignError, setAssignError] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'assigned' | 'completed'>('all');
  const [emailFilter, setEmailFilter] = useState("");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [appsRes, bikesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/applications`),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/bikes`),
      ]);
      const appsData = await appsRes.json();
      const bikesData = await bikesRes.json();
      if (appsData.success && bikesData.success) {
        setApplications(appsData.applications);
        setBikes(bikesData.bikes);
      } else {
        setError("Failed to fetch data");
      }
    } catch {
      setError("Failed to fetch data");
    }
    setLoading(false);
  }

  async function handleAssign(appId: string, bikeId: string) {
    setAssigning(appId);
    setAssignError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/assign-bike`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId: appId, bikeId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchData();
      } else {
        setAssignError(data.error || "Failed to assign bike.");
      }
    } catch {
      setAssignError("Failed to assign bike.");
    }
    setAssigning(null);
  }

  async function handleUpdateStatus(appId: string, status: 'approved' | 'rejected' | 'pending') {
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId, status }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedApp(prev => (prev && prev.id === appId ? { ...prev, status } : prev));
        fetchData();
      } else {
        setError(data.error || 'Failed to update application status.');
      }
    } catch {
      setError('Failed to update application status.');
    }
  }

  // End rental handled on Bikes page; no action here

  // Filtered applications based on statusFilter and emailFilter
  const filteredApplications = applications.filter(app => {
    const matchesEmail = app.email.toLowerCase().includes(emailFilter.toLowerCase());
    if (!matchesEmail) return false;
    if (statusFilter === 'all') return true;
    if (statusFilter === 'pending') return app.status === 'pending';
    if (statusFilter === 'assigned') return app.status === 'assigned' || !!app.bikeId;
    if (statusFilter === 'completed') return app.status === 'completed';
    return true;
  });

  // Sort with rejected at the very bottom, then completed, then assigned, then others; newest first within each group
  const sortedApplications = [...filteredApplications].sort((a, b) => {
    const rank = (app: Application) => {
      if (app.status === 'rejected') return 3;
      if (app.status === 'completed') return 2;
      if (app.status === 'assigned' || app.bikeId) return 1;
      return 0;
    };
    const diff = rank(a) - rank(b);
    if (diff !== 0) return diff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  function formatDate(value?: string) {
    if (!value) return '-';
    const d = new Date(value);
    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
  }

  // Print functionality
  const handlePrint = () => {
    if (!selectedApp) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const printContent = generatePrintContent(selectedApp);
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // CSV Export functionality
  const handleCSVExport = () => {
    if (!selectedApp) return;
    
    const csvData = [{
      'Application ID': selectedApp.id,
      'Last Name': selectedApp.lastName,
      'First Name': selectedApp.firstName,
      'Middle Name': selectedApp.middleName || '',
      'SR Code': selectedApp.srCode || '',
      'Sex': selectedApp.sex || '',
      'Date of Birth': formatDate(selectedApp.dateOfBirth),
      'Phone Number': selectedApp.phoneNumber || '',
      'Email': selectedApp.email,
      'College': selectedApp.college || '',
      'Program': selectedApp.program || '',
      'Section': selectedApp.collegeProgram || '',
      'House No': selectedApp.houseNo || '',
      'Street Name': selectedApp.streetName || '',
      'Barangay': selectedApp.barangay || '',
      'Municipality': selectedApp.municipality || '',
      'Province': selectedApp.province || '',
      'Distance from Campus': selectedApp.distanceFromCampus || '',
      'Family Income': selectedApp.familyIncome || '',
      'Intended Duration': selectedApp.intendedDuration || '',
      'Intended Duration Other': selectedApp.intendedDurationOther || '',
      'Status': selectedApp.status,
      'Assigned Bike': selectedApp.bike?.name || '',
      'Certificate of Indigency': selectedApp.certificatePath || '',
      'General Weighted Average Document': selectedApp.gwaDocumentPath || '',
      'Extra Curricular Activities Document': selectedApp.ecaDocumentPath || '',
      'ITR Document': selectedApp.itrDocumentPath || '',
      'Created At': formatDate(selectedApp.createdAt)
    }];
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `application_${selectedApp.lastName}_${selectedApp.firstName}_${selectedApp.id}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF Export functionality
  const handlePDFExport = () => {
    if (!selectedApp) return;
    
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPosition = 30;
    
    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Bike Rental Application Details', pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 20;
    
    // Personal Information Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Personal Information', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const personalInfo = [
      ['Last Name:', selectedApp.lastName],
      ['First Name:', selectedApp.firstName],
      ['Middle Name:', selectedApp.middleName || '-'],
      ['SR Code:', selectedApp.srCode || '-'],
      ['Sex:', selectedApp.sex || '-'],
      ['Date of Birth:', formatDate(selectedApp.dateOfBirth)],
      ['Phone Number:', selectedApp.phoneNumber || '-'],
      ['Email:', selectedApp.email]
    ];
    
    personalInfo.forEach(([label, value]) => {
      doc.text(label, margin, yPosition);
      doc.text(value, margin + 50, yPosition);
      yPosition += 6;
    });
    
    yPosition += 10;
    
    // Academic Information Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Academic Information', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const academicInfo = [
      ['College:', selectedApp.college || '-'],
      ['Program:', selectedApp.program || '-'],
      ['Section:', selectedApp.collegeProgram || '-']
    ];
    
    academicInfo.forEach(([label, value]) => {
      doc.text(label, margin, yPosition);
      doc.text(value, margin + 50, yPosition);
      yPosition += 6;
    });
    
    yPosition += 10;
    
    // Address Information Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Address Information', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const addressInfo = [
      ['House No:', selectedApp.houseNo || '-'],
      ['Street Name:', selectedApp.streetName || '-'],
      ['Barangay:', selectedApp.barangay || '-'],
      ['Municipality:', selectedApp.municipality || '-'],
      ['Province:', selectedApp.province || '-']
    ];
    
    addressInfo.forEach(([label, value]) => {
      doc.text(label, margin, yPosition);
      doc.text(value, margin + 50, yPosition);
      yPosition += 6;
    });
    
    yPosition += 10;
    
    // Other Details Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Other Details', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const otherInfo = [
      ['Distance from Campus:', selectedApp.distanceFromCampus || '-'],
      ['Monthly Family Income:', selectedApp.familyIncome || '-'],
      ['Intended Duration:', selectedApp.intendedDuration || '-'],
      ['Intended Duration (Other):', selectedApp.intendedDurationOther || '-'],
      ['Status:', selectedApp.status],
      ['Assigned Bike:', selectedApp.bike?.name || '-'],
      ['Application Date:', formatDate(selectedApp.createdAt)]
    ];
    
    otherInfo.forEach(([label, value]) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
      doc.text(label, margin, yPosition);
      doc.text(value, margin + 50, yPosition);
      yPosition += 6;
    });
    
    yPosition += 10;
    
    // Documents Section
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Documents', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const documents = [
      ['Certificate of Indigency:', selectedApp.certificatePath ? 'Uploaded' : 'Not provided'],
      ['General Weighted Average:', selectedApp.gwaDocumentPath ? 'Uploaded' : 'Not provided'],
      ['Extra Curricular Activities:', selectedApp.ecaDocumentPath ? 'Uploaded' : 'Not provided'],
      ['ITR Document:', selectedApp.itrDocumentPath ? 'Uploaded' : 'Not provided']
    ];
    
    documents.forEach(([label, value]) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
      doc.text(label, margin, yPosition);
      doc.text(value, margin + 50, yPosition);
      yPosition += 6;
    });
    
    // Save the PDF
    doc.save(`application_${selectedApp.lastName}_${selectedApp.firstName}_${selectedApp.id}.pdf`);
  };

  // Generate print content
  const generatePrintContent = (app: Application) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Application Details - ${app.firstName} ${app.lastName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #333;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #1976d2;
            padding-bottom: 10px;
          }
          .section {
            margin-bottom: 25px;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #1976d2;
            margin-bottom: 10px;
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 5px;
          }
          .field-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 15px;
          }
          .field {
            margin-bottom: 8px;
          }
          .field-label {
            font-size: 12px;
            color: #6b7280;
            font-weight: bold;
          }
          .field-value {
            font-size: 14px;
            margin-top: 2px;
          }
          .status {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
          }
          .status.approved { background: #dcfce7; color: #166534; }
          .status.rejected { background: #fef2f2; color: #991b1b; }
          .status.pending { background: #fef3c7; color: #92400e; }
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Bike Rental Application Details</h1>
          <p>Application ID: ${app.id}</p>
        </div>
        
        <div class="section">
          <div class="section-title">Personal Information</div>
          <div class="field-grid">
            <div class="field">
              <div class="field-label">Last Name</div>
              <div class="field-value">${app.lastName}</div>
            </div>
            <div class="field">
              <div class="field-label">First Name</div>
              <div class="field-value">${app.firstName}</div>
            </div>
            <div class="field">
              <div class="field-label">Middle Name</div>
              <div class="field-value">${app.middleName || '-'}</div>
            </div>
            <div class="field">
              <div class="field-label">SR Code</div>
              <div class="field-value">${app.srCode || '-'}</div>
            </div>
            <div class="field">
              <div class="field-label">Sex</div>
              <div class="field-value">${app.sex || '-'}</div>
            </div>
            <div class="field">
              <div class="field-label">Date of Birth</div>
              <div class="field-value">${formatDate(app.dateOfBirth)}</div>
            </div>
            <div class="field">
              <div class="field-label">Phone Number</div>
              <div class="field-value">${app.phoneNumber || '-'}</div>
            </div>
            <div class="field">
              <div class="field-label">Email</div>
              <div class="field-value">${app.email}</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Academic Information</div>
          <div class="field-grid">
            <div class="field">
              <div class="field-label">College</div>
              <div class="field-value">${(app as any).college || '-'}</div>
            </div>
            <div class="field">
              <div class="field-label">Program</div>
              <div class="field-value">${(app as any).program || '-'}</div>
            </div>
            <div class="field">
              <div class="field-label">Section</div>
              <div class="field-value">${app.collegeProgram || '-'}</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Address Information</div>
          <div class="field-grid">
            <div class="field">
              <div class="field-label">House No</div>
              <div class="field-value">${app.houseNo || '-'}</div>
            </div>
            <div class="field">
              <div class="field-label">Street Name</div>
              <div class="field-value">${app.streetName || '-'}</div>
            </div>
            <div class="field">
              <div class="field-label">Barangay</div>
              <div class="field-value">${app.barangay || '-'}</div>
            </div>
            <div class="field">
              <div class="field-label">Municipality</div>
              <div class="field-value">${app.municipality || '-'}</div>
            </div>
            <div class="field">
              <div class="field-label">Province</div>
              <div class="field-value">${app.province || '-'}</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Other Details</div>
          <div class="field-grid">
            <div class="field">
              <div class="field-label">Distance from Campus</div>
              <div class="field-value">${app.distanceFromCampus || '-'}</div>
            </div>
            <div class="field">
              <div class="field-label">Monthly Family Income</div>
              <div class="field-value">${app.familyIncome || '-'}</div>
            </div>
            <div class="field">
              <div class="field-label">Intended Duration</div>
              <div class="field-value">${app.intendedDuration || '-'}</div>
            </div>
            <div class="field">
              <div class="field-label">Intended Duration (Other)</div>
              <div class="field-value">${app.intendedDurationOther || '-'}</div>
            </div>
            <div class="field">
              <div class="field-label">Status</div>
              <div class="field-value">
                <span class="status ${app.status}">${app.status}</span>
              </div>
            </div>
            <div class="field">
              <div class="field-label">Assigned Bike</div>
              <div class="field-value">${app.bike?.name || '-'}</div>
            </div>
            <div class="field">
              <div class="field-label">Application Date</div>
              <div class="field-value">${formatDate(app.createdAt)}</div>
            </div>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Documents</div>
          <div class="field-grid">
            <div class="field">
              <div class="field-label">Certificate of Indigency</div>
              <div class="field-value">${app.certificatePath ? 'Uploaded' : 'Not provided'}</div>
            </div>
            <div class="field">
              <div class="field-label">General Weighted Average</div>
              <div class="field-value">${app.gwaDocumentPath ? 'Uploaded' : 'Not provided'}</div>
            </div>
            <div class="field">
              <div class="field-label">Extra Curricular Activities</div>
              <div class="field-value">${app.ecaDocumentPath ? 'Uploaded' : 'Not provided'}</div>
            </div>
            <div class="field">
              <div class="field-label">ITR Document</div>
              <div class="field-value">${app.itrDocumentPath ? 'Uploaded' : 'Not provided'}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  // Bulk CSV Export for all applications
  const handleBulkCSVExport = () => {
    if (filteredApplications.length === 0) return;
    
    const csvData = filteredApplications.map(app => ({
      'Application ID': app.id,
      'Last Name': app.lastName,
      'First Name': app.firstName,
      'Middle Name': app.middleName || '',
      'SR Code': app.srCode || '',
      'Sex': app.sex || '',
      'Date of Birth': formatDate(app.dateOfBirth),
      'Phone Number': app.phoneNumber || '',
      'Email': app.email,
      'College': (app as any).college || '',
      'Program': (app as any).program || '',
      'Section': app.collegeProgram || '',
      'House No': app.houseNo || '',
      'Street Name': app.streetName || '',
      'Barangay': app.barangay || '',
      'Municipality': app.municipality || '',
      'Province': app.province || '',
      'Distance from Campus': app.distanceFromCampus || '',
      'Family Income': app.familyIncome || '',
      'Intended Duration': app.intendedDuration || '',
      'Intended Duration Other': app.intendedDurationOther || '',
      'Status': app.status,
      'Assigned Bike': app.bike?.name || '',
      'Certificate of Indigency': app.certificatePath || '',
      'General Weighted Average Document': app.gwaDocumentPath || '',
      'Extra Curricular Activities Document': app.ecaDocumentPath || '',
      'ITR Document': app.itrDocumentPath || '',
      'Created At': formatDate(app.createdAt)
    }));
    
    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `bike_rental_applications_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7f8fa' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <BikeLoader />
          <h2 style={{ color: '#1976d2', margin: 0 }}>Loading applications...</h2>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '48px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', padding: 32 }}>
          <h1 style={{ color: '#1976d2', fontWeight: 800, fontSize: 32, marginBottom: 32, textAlign: 'center' }}>
            Rental Applications Management
          </h1>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginBottom: 0 }}>
            <div style={{
              display: 'inline-flex',
              background: '#f1f5f9',
              borderRadius: 999,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              padding: 4,
              gap: 2,
            }}>
              {[
                { label: 'All', value: 'all' },
                { label: 'Pending', value: 'pending' },
                { label: 'Assigned', value: 'assigned' },
                { label: 'Completed', value: 'completed' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value as typeof statusFilter)}
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: statusFilter === opt.value ? '#1976d2' : 'transparent',
                    color: statusFilter === opt.value ? '#fff' : '#1976d2',
                    fontWeight: 700,
                    fontSize: 15,
                    borderRadius: 999,
                    padding: '8px 28px',
                    cursor: 'pointer',
                    transition: 'background 0.15s, color 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {/* Email filter input and bulk export */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0 20px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                onClick={handleBulkCSVExport}
                disabled={filteredApplications.length === 0}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid #d1d5db',
                  background: filteredApplications.length === 0 ? '#f3f4f6' : '#fff',
                  color: filteredApplications.length === 0 ? '#9ca3af' : '#374151',
                  fontWeight: 600,
                  cursor: filteredApplications.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 14
                }}
                title="Export all visible applications to CSV"
              >
                📊 Export All to CSV ({filteredApplications.length})
              </button>
            </div>
            <input
              type="text"
              placeholder="Search by email..."
              value={emailFilter}
              onChange={e => setEmailFilter(e.target.value)}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: '1.5px solid #e0e0e0',
                fontSize: 16,
                minWidth: 220,
                outline: 'none',
                fontFamily: 'inherit',
                background: '#fff',
                color: '#222',
              }}
            />
          </div>
          {error && <div style={{ color: '#b22222', fontWeight: 600, marginBottom: 18 }}>{error}</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Name</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Email</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Bike</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Applied</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Details</th>
                <th style={{ padding: 12, textAlign: 'left', fontWeight: 700, color: '#111' }}>Assign Bike</th>
              </tr>
            </thead>
            <tbody>
              {sortedApplications.map(app => (
                <tr key={app.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: 10, color: '#111' }}>{app.lastName}, {app.firstName}</td>
                  <td style={{ padding: 10, color: '#111' }}>{app.email}</td>
                  <td style={{ padding: 10, color: '#111' }}>{app.bike ? app.bike.name : '-'}</td>
                  <td style={{ padding: 10, color: '#111' }}>{new Date(app.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: 10 }}>
                    <button
                      onClick={() => setSelectedApp(app)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: '1.5px solid #e0e0e0',
                        background: '#fff',
                        cursor: 'pointer',
                        color: '#1976d2',
                        fontWeight: 700
                      }}
                    >
                      View
                    </button>
                  </td>
                  <td style={{ padding: 10 }}>
                    {app.bikeId ? (
                      <span style={{ color: '#22c55e', fontWeight: 600 }}>Assigned</span>
                    ) : app.status === 'completed' ? (
                      <span style={{ color: '#6b7280', fontWeight: 600 }}>Completed</span>
                    ) : app.status === 'rejected' ? (
                      <span style={{ color: '#ef4444', fontWeight: 700 }}>Rejected</span>
                    ) : (
                      <>
                        <select
                          style={{ padding: '6px 12px', borderRadius: 6, border: '1.5px solid #e0e0e0', fontSize: 15, marginRight: 8 }}
                          disabled={assigning === app.id || app.status !== 'approved'}
                          defaultValue=""
                          onChange={e => handleAssign(app.id, e.target.value)}
                        >
                          <option value="" disabled>{app.status !== 'approved' ? 'Approval First' : 'Select bike'}</option>
                          {bikes.filter(b => b.status === 'available').map(bike => (
                            <option key={bike.id} value={bike.id}>{bike.name}</option>
                          ))}
                        </select>
                        {assigning === app.id && <span style={{ color: '#1976d2' }}>Assigning...</span>}
                        {assignError && <span style={{ color: '#b22222', fontWeight: 500 }}>{assignError}</span>}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedApp && (
            <div
              role="dialog"
              aria-modal="true"
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16,
                zIndex: 1000,
              }}
              onClick={() => setSelectedApp(null)}
            >
              <div
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  width: 'min(100%, 980px)',
                  maxHeight: '90vh',
                  overflowY: 'auto',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                  color: '#111827',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottom: '1px solid #e5e7eb' }}>
                  <h2 style={{ margin: 0, color: '#111827' }}>Application Details</h2>
                  <button onClick={() => setSelectedApp(null)} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ padding: 20 }}>
                  {/* Sections */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Personal</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="Last Name" value={selectedApp.lastName} bold />
                        <Field label="First Name" value={selectedApp.firstName} bold />
                        <Field label="Middle Name" value={selectedApp.middleName || '-'} />
                        <Field label="SR Code" value={selectedApp.srCode || '-'} />
                        <Field label="Sex" value={selectedApp.sex || '-'} />
                        <Field label="Date of Birth" value={formatDate(selectedApp.dateOfBirth)} />
                        <Field label="Phone" value={selectedApp.phoneNumber || '-'} />
                        <Field label="Email" value={selectedApp.email} />
                      </div>
                    </div>

                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Academic</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="College" value={(selectedApp as any).college || '-'} />
                        <Field label="Program" value={(selectedApp as any).program || '-'} />
                        <Field label="Section" value={selectedApp.collegeProgram || '-'} />
                      </div>
                    </div>

                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Address</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="House No." value={selectedApp.houseNo || '-'} />
                        <Field label="Street" value={selectedApp.streetName || '-'} />
                        <Field label="Barangay" value={selectedApp.barangay || '-'} />
                        <Field label="Municipality" value={selectedApp.municipality || '-'} />
                        <Field label="Province" value={selectedApp.province || '-'} />
                      </div>
                    </div>

                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Other Details</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="Distance from Campus" value={selectedApp.distanceFromCampus || '-'} />
                        <Field label="Monthly Family Income" value={selectedApp.familyIncome || '-'} />
                        <Field label="Intended Duration" value={selectedApp.intendedDuration || '-'} />
                        <Field label="Intended Duration (Other)" value={selectedApp.intendedDurationOther || '-'} />
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Documents</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16 }}>
                      {selectedApp.certificatePath && (
                        <DocCard title="Certificate of Indigency" url={selectedApp.certificatePath} />
                      )}
                      {selectedApp.gwaDocumentPath && (
                        <DocCard title="General Weighted Average" url={selectedApp.gwaDocumentPath} />
                      )}
                      {selectedApp.ecaDocumentPath && (
                        <DocCard title="Extra Curricular Activities" url={selectedApp.ecaDocumentPath} />
                      )}
                      {selectedApp.itrDocumentPath && (
                        <DocCard title="ITR" url={selectedApp.itrDocumentPath} />
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {selectedApp.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(selectedApp.id, 'approved')}
                          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(selectedApp.id, 'rejected')}
                          style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#ef4444', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    <div style={{ marginLeft: 8, color: '#6b7280', fontSize: 14 }}>
                      Status: <span style={{ fontWeight: 700, color: selectedApp.status === 'approved' ? '#22c55e' : selectedApp.status === 'rejected' ? '#ef4444' : '#6b7280' }}>{selectedApp.status}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Export buttons */}
                    <button
                      onClick={handlePrint}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      title="Print Application"
                    >
                      🖨️ Print
                    </button>
                    <button
                      onClick={handleCSVExport}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      title="Export to CSV"
                    >
                      📊 CSV
                    </button>
                    <button
                      onClick={handlePDFExport}
                      style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                      title="Export to PDF"
                    >
                      📄 PDF
                    </button>
                    <button
                      onClick={() => setSelectedApp(null)}
                      style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#1976d2', color: '#fff', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Back
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 

function Field({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>{label}</div>
      <div style={{ fontWeight: bold ? 600 as any : 400 }}>{value}</div>
    </div>
  );
}

function DocCard({ title, url }: { title: string; url: string }) {
  const isPdf = url.toLowerCase().endsWith('.pdf');
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, background: '#fff' }}>
      <div style={{ fontSize: 13, color: '#374151', fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isPdf ? (
          <iframe src={url} title={`${title} PDF`} style={{ width: '100%', height: 220, borderRadius: 8, border: '1px solid #e5e7eb' }} />
        ) : (
          <img src={url} alt={title} style={{ maxHeight: 220, borderRadius: 8, border: '1px solid #e5e7eb', objectFit: 'contain' }} />
        )}
        <a href={url} target="_blank" rel="noreferrer" style={{ color: '#1976d2', fontWeight: 700, textDecoration: 'none' }}>Open in new tab</a>
      </div>
    </div>
  );
}