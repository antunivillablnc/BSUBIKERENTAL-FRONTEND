"use client";
import { useEffect, useState } from "react";
import BikeLoader from "../../components/BikeLoader";
import AdminHeader from "../../components/AdminHeader";
import jsPDF from 'jspdf';
import Papa from 'papaparse';

interface Application {
  id: string;
  applicationType?: string; // 'student' or 'staff'
  
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

  // Student-specific: Academic
  collegeProgram?: string;
  college?: string;
  program?: string;
  section?: string;
  gwaLastSemester?: string;
  extracurricularActivities?: string | null;

  // Staff-specific
  department?: string;
  staffId?: string;
  employeeType?: string;
  purpose?: string;
  startDate?: string;
  durationDays?: number;

  // Address (student only)
  houseNo?: string;
  streetName?: string;
  barangay?: string;
  municipality?: string;
  province?: string;

  // Other details (student only)
  distanceFromCampus?: string;
  familyIncome?: string;
  intendedDuration?: string;
  intendedDurationOther?: string | null;
  
  // Documents
  certificatePath?: string | null;
  gwaDocumentPath?: string | null;
  ecaDocumentPath?: string | null;
  itrDocumentPath?: string | null;
  employmentCertPath?: string | null;

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
  const [query, setQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [appsRes, bikesRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/applications`, { credentials: 'include' }),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/bikes`, { credentials: 'include' }),
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
        credentials: 'include',
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
        credentials: 'include',
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
    const needle = query.toLowerCase();
    const fullName = `${app.firstName || ''} ${app.middleName || ''} ${app.lastName || ''}`.replace(/\s+/g,' ').trim().toLowerCase();
    const matchesQuery = !needle
      || app.email.toLowerCase().includes(needle)
      || fullName.includes(needle)
      || (app.firstName || '').toLowerCase().includes(needle)
      || (app.lastName || '').toLowerCase().includes(needle);
    if (!matchesQuery) return false;
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

  const getStatusColor = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'pending':
        return '#f59e0b';
      case 'assigned':
        return '#22c55e';
      case 'completed':
        return '#6b7280';
      case 'rejected':
        return '#dc2626';
      case 'approved':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getStatusHoverColor = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'pending':
        return '#d97706'; // deeper amber
      case 'assigned':
        return '#16a34a'; // deeper green
      case 'completed':
        return '#374151'; // darker gray
      case 'rejected':
        return '#b91c1c'; // deeper red
      case 'approved':
        return '#1d4ed8'; // deeper blue
      default:
        return '#374151';
    }
  };

  const getStatusBaseBg = (status: string) => {
    switch ((status || '').toLowerCase()) {
      case 'pending':
        return 'rgba(245, 158, 11, 0.06)'; // amber-500 @ 6%
      case 'assigned':
        return 'rgba(34, 197, 94, 0.06)'; // green-500 @ 6%
      case 'completed':
        return 'rgba(107, 114, 128, 0.06)'; // gray-500 @ 6%
      case 'rejected':
        return 'rgba(220, 38, 38, 0.06)'; // red-600 @ 6%
      case 'approved':
        return 'rgba(59, 130, 246, 0.06)'; // blue-500 @ 6%
      default:
        return 'rgba(148, 163, 184, 0.05)'; // slate-400 @ 5%
    }
  };

  const getStatusHoverBg = (_status: string) => {
    // Neutral hover tint for all cards, regardless of status
    return 'rgba(0, 0, 0, 0.06)';
  };

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
    
    const isStaff = selectedApp.applicationType === 'staff';
    
    const csvData: any[] = isStaff ? [{
      'Application ID': selectedApp.id,
      'Application Type': 'Staff',
      'Last Name': selectedApp.lastName,
      'First Name': selectedApp.firstName,
      'Middle Name': selectedApp.middleName || '',
      'Staff ID': selectedApp.staffId || '',
      'Email': selectedApp.email,
      'Employee Type': selectedApp.employeeType || '',
      'Department': selectedApp.department || '',
      'Purpose/Reason': selectedApp.purpose || '',
      'Start Date': formatDate(selectedApp.startDate),
      'Duration (days)': selectedApp.durationDays || '',
      'Status': selectedApp.status,
      'Assigned Bike': selectedApp.bike?.name || '',
      'Created At': formatDate(selectedApp.createdAt)
    }] : [{
      'Application ID': selectedApp.id,
      'Application Type': 'Student',
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
    
    const isStaff = selectedApp.applicationType === 'staff';
    
    // Title
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`Bike Rental Application Details (${isStaff ? 'Staff' : 'Student'})`, pageWidth / 2, yPosition, { align: 'center' });
    
    yPosition += 20;
    
    // Personal Information Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Personal Information', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const personalInfo = isStaff ? [
      ['Last Name:', selectedApp.lastName],
      ['First Name:', selectedApp.firstName],
      ['Middle Name:', selectedApp.middleName || '-'],
      ['Staff ID:', selectedApp.staffId || '-'],
      ['Email:', selectedApp.email]
    ] : [
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
    
    if (isStaff) {
      // Staff Details Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Staff Details', margin, yPosition);
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const staffInfo = [
        ['Employee Type:', selectedApp.employeeType || '-'],
        ['Department:', selectedApp.department || '-'],
        ['Start Date:', formatDate(selectedApp.startDate)],
        ['Duration (days):', String(selectedApp.durationDays || '-')],
        ['Purpose/Reason:', selectedApp.purpose || '-']
      ];
      
      staffInfo.forEach(([label, value]) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 30;
        }
        doc.text(label, margin, yPosition);
        doc.text(value, margin + 50, yPosition);
        yPosition += 6;
      });
    } else {
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
        ['Intended Duration (Other):', selectedApp.intendedDurationOther || '-']
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
    }
    
    yPosition += 10;
    
    // Status Information
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Application Status', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const statusInfo = [
      ['Status:', selectedApp.status],
      ['Assigned Bike:', selectedApp.bike?.name || '-'],
      ['Application Date:', formatDate(selectedApp.createdAt)]
    ];
    
    statusInfo.forEach(([label, value]) => {
      doc.text(label, margin, yPosition);
      doc.text(value, margin + 50, yPosition);
      yPosition += 6;
    });
    
    // Documents Section - only for students
    if (!isStaff) {
      yPosition += 10;
      
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
    }
    
    // Save the PDF
    doc.save(`application_${selectedApp.lastName}_${selectedApp.firstName}_${selectedApp.id}.pdf`);
  };

  // Generate print content
  const generatePrintContent = (app: Application) => {
    const isStaff = app.applicationType === 'staff';
    
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
          <h1>Bike Rental Application Details (${isStaff ? 'Staff' : 'Student'})</h1>
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
              <div class="field-label">${isStaff ? 'Staff ID' : 'SR Code'}</div>
              <div class="field-value">${isStaff ? (app.staffId || '-') : (app.srCode || '-')}</div>
            </div>
            ${!isStaff ? `
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
            ` : ''}
            <div class="field">
              <div class="field-label">Email</div>
              <div class="field-value">${app.email}</div>
            </div>
          </div>
        </div>
        
        ${isStaff ? `
        <div class="section">
          <div class="section-title">Staff Details</div>
          <div class="field-grid">
            <div class="field">
              <div class="field-label">Employee Type</div>
              <div class="field-value">${app.employeeType || '-'}</div>
            </div>
            <div class="field">
              <div class="field-label">Department</div>
              <div class="field-value">${app.department || '-'}</div>
            </div>
            <div class="field">
              <div class="field-label">Start Date</div>
              <div class="field-value">${formatDate(app.startDate)}</div>
            </div>
            <div class="field">
              <div class="field-label">Duration (days)</div>
              <div class="field-value">${app.durationDays || '-'}</div>
            </div>
          </div>
          <div class="field">
            <div class="field-label">Purpose/Reason</div>
            <div class="field-value">${app.purpose || '-'}</div>
          </div>
        </div>
        ` : `
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
          </div>
        </div>
        `}
        
        <div class="section">
          <div class="section-title">Application Status</div>
          <div class="field-grid">
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
        
        ${!isStaff ? `
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
        ` : ''}
      </body>
      </html>
    `;
  };

  // Bulk CSV Export for all applications
  const handleBulkCSVExport = () => {
    if (filteredApplications.length === 0) return;
    
    const csvData = filteredApplications.map(app => {
      const isStaff = app.applicationType === 'staff';
      
      // Common fields for all applications
      const baseData: any = {
        'Application ID': app.id,
        'Application Type': isStaff ? 'Staff' : 'Student',
        'Last Name': app.lastName,
        'First Name': app.firstName,
        'Middle Name': app.middleName || '',
        'Email': app.email,
        'Status': app.status,
        'Assigned Bike': app.bike?.name || '',
        'Created At': formatDate(app.createdAt)
      };
      
      if (isStaff) {
        // Staff-specific fields
        return {
          ...baseData,
          'Staff ID': app.staffId || '',
          'Employee Type': app.employeeType || '',
          'Department': app.department || '',
          'Purpose/Reason': app.purpose || '',
          'Start Date': formatDate(app.startDate),
          'Duration (days)': app.durationDays || '',
          // Empty student fields for consistency
          'SR Code': '',
          'Sex': '',
          'Date of Birth': '',
          'Phone Number': '',
          'College': '',
          'Program': '',
          'Section': '',
          'House No': '',
          'Street Name': '',
          'Barangay': '',
          'Municipality': '',
          'Province': '',
          'Distance from Campus': '',
          'Family Income': '',
          'Intended Duration': '',
          'Intended Duration Other': '',
          'Certificate of Indigency': '',
          'General Weighted Average Document': '',
          'Extra Curricular Activities Document': '',
          'ITR Document': ''
        };
      } else {
        // Student-specific fields
        return {
          ...baseData,
          'SR Code': app.srCode || '',
          'Sex': app.sex || '',
          'Date of Birth': formatDate(app.dateOfBirth),
          'Phone Number': app.phoneNumber || '',
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
          'Certificate of Indigency': app.certificatePath || '',
          'General Weighted Average Document': app.gwaDocumentPath || '',
          'Extra Curricular Activities Document': app.ecaDocumentPath || '',
          'ITR Document': app.itrDocumentPath || '',
          // Empty staff fields for consistency
          'Staff ID': '',
          'Employee Type': '',
          'Department': '',
          'Purpose/Reason': '',
          'Start Date': '',
          'Duration (days)': ''
        };
      }
    });
    
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
        <AdminHeader
          title="Applications"
          subtitle="Manage and review rental applications"
          stats={[
            { label: 'Total', value: applications.length, color: '#ffffff' },
            { label: 'Pending', value: applications.filter(a => a.status === 'pending').length, color: '#f59e0b' },
            { label: 'Assigned', value: applications.filter(a => a.status === 'assigned' || !!a.bikeId).length, color: '#22c55e' },
            { label: 'Completed', value: applications.filter(a => a.status === 'completed').length, color: '#6b7280' },
          ]}
        >
          <input
            type="text"
            placeholder="Search by name or email..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              padding: '10px 16px',
              borderRadius: 10,
              border: '2px solid rgba(255,255,255,0.2)',
              fontSize: 15,
              minWidth: 240,
              outline: 'none',
              fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.95)',
              color: '#1e293b',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              fontWeight: 500
            }}
          />
        </AdminHeader>
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 16px rgba(0,0,0,0.10)', padding: 32 }}>
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
          {/* Bulk export */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', margin: '10px 0 20px 0' }}>
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
          </div>
          {error && <div style={{ color: '#b22222', fontWeight: 600, marginBottom: 18 }}>{error}</div>}
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.98)', 
            borderRadius: 20, 
            border: '1px solid rgba(0, 0, 0, 0.08)', 
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
          }}>
            {sortedApplications.length === 0 ? (
              <div style={{ padding: 48, textAlign: 'center', color: '#4b5563' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                <h3 style={{ fontSize: 20, marginBottom: 8, color: '#374151' }}>No applications found</h3>
                <p style={{ color: '#6b7280' }}>Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              sortedApplications.map((app, index) => (
                <div
                  key={app.id}
                  style={{
                    borderBottom: index < sortedApplications.length - 1 ? '1px solid rgba(0, 0, 0, 0.06)' : 'none',
                    padding: '24px 28px',
                    transition: 'background 220ms ease, box-shadow 220ms ease, transform 220ms ease, border-left-color 220ms ease, color 220ms ease',
                    position: 'relative',
                    borderLeft: `6px solid ${getStatusColor(app.status)}`,
                    background: getStatusBaseBg(app.status),
                    cursor: 'pointer'
                  }}
                  onClick={() => setSelectedApp(app)}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedApp(app); }}
                  onMouseEnter={(e) => {
                    const el = (e.currentTarget as HTMLDivElement);
                    el.style.background = getStatusHoverBg(app.status);
                    el.style.transform = 'translateX(4px)';
                    el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                    el.style.borderLeft = `6px solid ${getStatusHoverColor(app.status)}`;
                    const title = el.querySelector('h3') as HTMLElement | null;
                    if (title) title.style.color = '#0f172a';
                  }}
                  onMouseLeave={(e) => {
                    const el = (e.currentTarget as HTMLDivElement);
                    el.style.background = getStatusBaseBg(app.status);
                    el.style.transform = 'translateX(0)';
                    el.style.boxShadow = 'none';
                    el.style.borderLeft = `6px solid ${getStatusColor(app.status)}`;
                    const title = el.querySelector('h3') as HTMLElement | null;
                    if (title) title.style.color = '#1e293b';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                        <h3 style={{ color: '#1e293b', fontSize: 19, fontWeight: 800, margin: 0, letterSpacing: '-0.3px' }}>
                          {app.firstName} {app.lastName}
                        </h3>
                        <span style={{
                          background: getStatusColor(app.status),
                          color: '#fff',
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '5px 10px',
                          borderRadius: 20,
                          textTransform: 'capitalize',
                          letterSpacing: '0.3px',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                        }}>
                          {app.status}
                        </span>
                        {app.bike && (
                          <span style={{
                            background: '#1976d2', color: '#fff', fontSize: 11, fontWeight: 800, padding: '5px 10px', borderRadius: 20
                          }}>
                            {app.bike.name}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 13, color: '#64748b', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600 }}>📧 {app.email}</span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span style={{ fontWeight: 500 }}>📅 {new Date(app.createdAt).toLocaleDateString()}</span>
                        {app.bikeId && (
                          <>
                            <span style={{ color: '#cbd5e1' }}>•</span>
                            <span style={{ fontWeight: 500 }}>🔧 Assigned</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                      {app.bikeId ? (
                        <span style={{ color: '#22c55e', fontWeight: 700 }}>Assigned</span>
                      ) : app.status === 'completed' ? (
                        <span style={{ color: '#6b7280', fontWeight: 700 }}>Completed</span>
                      ) : app.status === 'rejected' ? (
                        <span style={{ color: '#ef4444', fontWeight: 800 }}>Rejected</span>
                      ) : (
                        <>
                          <select
                            style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 14 }}
                            disabled={assigning === app.id || app.status !== 'approved'}
                            defaultValue=""
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            onChange={e => handleAssign(app.id, e.target.value)}
                          >
                            <option value="" disabled>{app.status !== 'approved' ? 'Approve first' : 'Select bike'}</option>
                            {bikes.filter(b => b.status === 'available').map(bike => (
                              <option key={bike.id} value={bike.id}>{bike.name}</option>
                            ))}
                          </select>
                          {assigning === app.id && <span style={{ color: '#1976d2' }}>Assigning...</span>}
                          {assignError && <span style={{ color: '#b22222', fontWeight: 700 }}>{assignError}</span>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
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
                    {/* Personal Section */}
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Personal</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <Field label="Last Name" value={selectedApp.lastName} bold />
                        <Field label="First Name" value={selectedApp.firstName} bold />
                        <Field label="Middle Name" value={selectedApp.middleName || '-'} />
                        {selectedApp.applicationType === 'staff' ? (
                          <Field label="Staff ID" value={selectedApp.staffId || '-'} />
                        ) : (
                          <Field label="SR Code" value={selectedApp.srCode || '-'} />
                        )}
                        {selectedApp.applicationType !== 'staff' && (
                          <>
                            <Field label="Sex" value={selectedApp.sex || '-'} />
                            <Field label="Date of Birth" value={formatDate(selectedApp.dateOfBirth)} />
                            <Field label="Phone" value={selectedApp.phoneNumber || '-'} />
                          </>
                        )}
                        <Field label="Email" value={selectedApp.email} />
                      </div>
                    </div>

                    {/* Academic/Staff Section */}
                    {selectedApp.applicationType === 'staff' ? (
                      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Staff Details</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <Field label="Employee Type" value={selectedApp.employeeType || '-'} />
                          <Field label="Department" value={selectedApp.department || '-'} />
                          <Field label="Start Date" value={formatDate(selectedApp.startDate)} />
                          <Field label="Duration (days)" value={String(selectedApp.durationDays || '-')} />
                        </div>
                        <div style={{ marginTop: 12 }}>
                          <Field label="Purpose/Reason" value={selectedApp.purpose || '-'} />
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Academic</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <Field label="College" value={(selectedApp as any).college || '-'} />
                          <Field label="Program" value={(selectedApp as any).program || '-'} />
                          <Field label="Section" value={selectedApp.collegeProgram || '-'} />
                        </div>
                      </div>
                    )}

                    {/* Address Section - only for students */}
                    {selectedApp.applicationType !== 'staff' && (
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
                    )}

                    {/* Other Details Section - only for students */}
                    {selectedApp.applicationType !== 'staff' && (
                      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 10 }}>Other Details</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          <Field label="Distance from Campus" value={selectedApp.distanceFromCampus || '-'} />
                          <Field label="Monthly Family Income" value={selectedApp.familyIncome || '-'} />
                          <Field label="Intended Duration" value={selectedApp.intendedDuration || '-'} />
                          <Field label="Intended Duration (Other)" value={selectedApp.intendedDurationOther || '-'} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Documents - only for students */}
                  {selectedApp.applicationType !== 'staff' && (
                    <div style={{ marginTop: 16 }}>
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
                  )}
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