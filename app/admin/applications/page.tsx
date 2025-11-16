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
  
  // Admin evaluation - structured format
  evaluation?: {
    // Evaluated and Recommended by (As to Eligibility)
    eligibilityStatus?: 'eligible' | 'notEligible' | null;
    eligibilityRemarks?: string | null;
    eligibilitySignatureName?: string | null;
    eligibilitySignaturePath?: string | null;
    
    // As to Ranking (for students only)
    rankingScore?: string | null;
    rankingRecommended?: boolean | null;
    rankingSignatureName?: string | null;
    rankingSignaturePath?: string | null;
    
    // Certified (Health Services)
    healthStatus?: 'fit' | 'notFit' | null;
    healthRemarks?: string | null;
    healthSignatureName?: string | null;
    healthSignaturePath?: string | null;
    
    // Approved by
    approvedSignatureName?: string | null;
    approvedSignaturePath?: string | null;
    
    // Released by
    releasedBikePlate?: string | null;
    releasedSignatureName?: string | null;
    releasedSignaturePath?: string | null;
  } | null;
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
  const [evaluationData, setEvaluationData] = useState({
    eligibilityStatus: null as 'eligible' | 'notEligible' | null,
    eligibilityRemarks: '',
    eligibilitySignatureName: '',
    eligibilitySignaturePath: null as string | null,
    rankingScore: '',
    rankingRecommended: null as boolean | null,
    rankingSignatureName: '',
    rankingSignaturePath: null as string | null,
    healthStatus: null as 'fit' | 'notFit' | null,
    healthRemarks: '',
    healthSignatureName: '',
    healthSignaturePath: null as string | null,
    approvedSignatureName: '',
    approvedSignaturePath: null as string | null,
    releasedBikePlate: '',
    releasedSignatureName: '',
    releasedSignaturePath: null as string | null,
  });
  const [signatureFiles, setSignatureFiles] = useState({
    eligibilitySignatureFile: null as File | null,
    rankingSignatureFile: null as File | null,
    healthSignatureFile: null as File | null,
    approvedSignatureFile: null as File | null,
    releasedSignatureFile: null as File | null,
  });
  const [savingEvaluation, setSavingEvaluation] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to format date for date input (YYYY-MM-DD)
  // Converts MM/DD/YYYY (from MongoDB) to YYYY-MM-DD (for HTML date inputs)
  const formatDateForInput = (date: any): string => {
    if (!date) return '';
    if (typeof date === 'string') {
      // If already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
      // If in MM/DD/YYYY format (from MongoDB), convert to YYYY-MM-DD
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        const [month, day, year] = date.split('/');
        return `${year}-${month}-${day}`;
      }
      // Try to parse and convert
      const d = new Date(date);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    return '';
  };

  // Sync evaluation data when selected app changes
  useEffect(() => {
    if (selectedApp && selectedApp.evaluation) {
      const evalData = selectedApp.evaluation;
      // Auto-fill bike plate number from assigned bike if available and not already set
      const bikePlate = selectedApp.bike?.name || null;
      setEvaluationData({
        eligibilityStatus: evalData.eligibilityStatus || null,
        eligibilityRemarks: evalData.eligibilityRemarks || '',
        eligibilitySignatureName: evalData.eligibilitySignatureName || '',
        eligibilitySignaturePath: evalData.eligibilitySignaturePath || null,
        rankingScore: evalData.rankingScore || '',
        rankingRecommended: evalData.rankingRecommended ?? null,
        rankingSignatureName: evalData.rankingSignatureName || '',
        rankingSignaturePath: evalData.rankingSignaturePath || null,
        healthStatus: evalData.healthStatus || null,
        healthRemarks: evalData.healthRemarks || '',
        healthSignatureName: evalData.healthSignatureName || '',
        healthSignaturePath: evalData.healthSignaturePath || null,
        approvedSignatureName: evalData.approvedSignatureName || '',
        approvedSignaturePath: evalData.approvedSignaturePath || null,
        releasedBikePlate: evalData.releasedBikePlate || bikePlate || '',
        releasedSignatureName: evalData.releasedSignatureName || '',
        releasedSignaturePath: evalData.releasedSignaturePath || null,
      });
    } else {
      // Auto-fill bike plate number from assigned bike if available
      const bikePlate = selectedApp?.bike?.name || null;
      setEvaluationData({
        eligibilityStatus: null,
        eligibilityRemarks: '',
        eligibilitySignatureName: '',
        eligibilitySignaturePath: null,
        rankingScore: '',
        rankingRecommended: null,
        rankingSignatureName: '',
        rankingSignaturePath: null,
        healthStatus: null,
        healthRemarks: '',
        healthSignatureName: '',
        healthSignaturePath: null,
        approvedSignatureName: '',
        approvedSignaturePath: null,
        releasedBikePlate: bikePlate || '',
        releasedSignatureName: '',
        releasedSignaturePath: null,
      });
      setSignatureFiles({
        eligibilitySignatureFile: null,
        rankingSignatureFile: null,
        healthSignatureFile: null,
        approvedSignatureFile: null,
        releasedSignatureFile: null,
      });
    }
  }, [selectedApp]);

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

  // Check if evaluation form is complete (checks both saved and current form state)
  const isEvaluationComplete = (app: Application | null): boolean => {
    if (!app) return false;
    
    // Check saved evaluation first
    if (app.evaluation) {
      const evalData = app.evaluation;
      const hasEligibility = !!(evalData.eligibilityStatus && evalData.eligibilitySignatureName);
      const hasHealth = !!(evalData.healthStatus && evalData.healthSignatureName);
      const hasApproved = !!(evalData.approvedSignatureName);
      
      if (app.applicationType !== 'staff') {
        const hasRanking = !!(evalData.rankingScore && evalData.rankingRecommended !== null && evalData.rankingSignatureName);
        if (hasEligibility && hasRanking && hasHealth && hasApproved) return true;
      } else {
        if (hasEligibility && hasHealth && hasApproved) return true;
      }
    }
    
    // Also check current form state if it's the selected app
    if (app.id === selectedApp?.id) {
      const hasEligibility = !!(evaluationData.eligibilityStatus && evaluationData.eligibilitySignatureName);
      const hasHealth = !!(evaluationData.healthStatus && evaluationData.healthSignatureName);
      const hasApproved = !!(evaluationData.approvedSignatureName);
      
      if (app.applicationType !== 'staff') {
        const hasRanking = !!(evaluationData.rankingScore && evaluationData.rankingRecommended !== null && evaluationData.rankingSignatureName);
        return !!(hasEligibility && hasRanking && hasHealth && hasApproved);
      }
      
      return !!(hasEligibility && hasHealth && hasApproved);
    }
    
    return false;
  };

  async function handleUpdateStatus(appId: string, status: 'approved' | 'rejected' | 'pending') {
    setError("");
    
    // Check if evaluation is required before approval
    if (status === 'approved') {
      const app = applications.find(a => a.id === appId) || selectedApp;
      
      // If evaluation form is filled but not saved, save it first
      if (app && selectedApp && app.id === selectedApp.id && !app.evaluation) {
        // Check if current form state is complete
        const hasEligibility = !!(evaluationData.eligibilityStatus && evaluationData.eligibilitySignatureName);
        const hasHealth = !!(evaluationData.healthStatus && evaluationData.healthSignatureName);
        const hasApproved = !!(evaluationData.approvedSignatureName);
        const isStudent = selectedApp.applicationType !== 'staff';
        const hasRanking = isStudent ? !!(evaluationData.rankingScore && evaluationData.rankingRecommended !== null && evaluationData.rankingSignatureName) : true;
        
        if (hasEligibility && hasHealth && hasApproved && hasRanking) {
          // Auto-save evaluation before accepting
          try {
            await handleSaveEvaluation(appId);
            // Refresh data to get updated evaluation
            await fetchData();
          } catch (e) {
            setError('Failed to save evaluation. Please save it manually before accepting.');
            return;
          }
        }
      }
      
      if (!isEvaluationComplete(app)) {
        setError('Please complete the evaluation form (including all dates and signature names) before accepting the application.');
        return;
      }
    }
    
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

  async function handleSaveEvaluation(appId: string) {
    setSavingEvaluation(true);
    setError("");
    try {
      // Ensure all evaluation fields are included
      const completeEvaluationData = {
        eligibilityStatus: evaluationData.eligibilityStatus,
        eligibilityRemarks: evaluationData.eligibilityRemarks || '',
        eligibilitySignatureName: evaluationData.eligibilitySignatureName || '',
        eligibilitySignaturePath: evaluationData.eligibilitySignaturePath,
        rankingScore: evaluationData.rankingScore || '',
        rankingRecommended: evaluationData.rankingRecommended,
        rankingSignatureName: evaluationData.rankingSignatureName || '',
        rankingSignaturePath: evaluationData.rankingSignaturePath,
        healthStatus: evaluationData.healthStatus,
        healthRemarks: evaluationData.healthRemarks || '',
        healthSignatureName: evaluationData.healthSignatureName || '',
        healthSignaturePath: evaluationData.healthSignaturePath,
        approvedSignatureName: evaluationData.approvedSignatureName || '',
        approvedSignaturePath: evaluationData.approvedSignaturePath,
        releasedBikePlate: evaluationData.releasedBikePlate || '',
        releasedSignatureName: evaluationData.releasedSignatureName || '',
        releasedSignaturePath: evaluationData.releasedSignaturePath,
      };
      
      const formData = new FormData();
      formData.append('applicationId', appId);
      formData.append('evaluation', JSON.stringify(completeEvaluationData));
      
      // Append signature files if they exist
      if (signatureFiles.eligibilitySignatureFile) {
        formData.append('eligibilitySignatureFile', signatureFiles.eligibilitySignatureFile);
      }
      if (signatureFiles.rankingSignatureFile) {
        formData.append('rankingSignatureFile', signatureFiles.rankingSignatureFile);
      }
      if (signatureFiles.healthSignatureFile) {
        formData.append('healthSignatureFile', signatureFiles.healthSignatureFile);
      }
      if (signatureFiles.approvedSignatureFile) {
        formData.append('approvedSignatureFile', signatureFiles.approvedSignatureFile);
      }
      if (signatureFiles.releasedSignatureFile) {
        formData.append('releasedSignatureFile', signatureFiles.releasedSignatureFile);
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/applications/evaluation`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setSelectedApp(prev => (prev && prev.id === appId ? { ...prev, evaluation: data.evaluation || completeEvaluationData } : prev));
        setError("");
        // Clear file inputs after successful save
        setSignatureFiles({
          eligibilitySignatureFile: null,
          rankingSignatureFile: null,
          healthSignatureFile: null,
          approvedSignatureFile: null,
          releasedSignatureFile: null,
        });
        // Refresh data to get updated evaluation
        fetchData();
      } else {
        setError(data.error || 'Failed to save evaluation.');
      }
    } catch {
      setError('Failed to save evaluation.');
    } finally {
      setSavingEvaluation(false);
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
    // Handle MM/DD/YYYY format dates (from MongoDB)
    if (typeof value === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
      const [month, day, year] = value.split('/');
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString();
      }
    }
    // Handle YYYY-MM-DD format dates
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-');
      const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString();
      }
    }
    // Try parsing as regular date string
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
    
    const evalData = selectedApp.evaluation || {};
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
      'Created At': formatDate(selectedApp.createdAt),
      'Eligibility Status': evalData.eligibilityStatus || '',
      'Eligibility Remarks': evalData.eligibilityRemarks || '',
      'Eligibility Signature Name': evalData.eligibilitySignatureName || '',
      'Eligibility E-Signature': evalData.eligibilitySignaturePath || '',
      'Health Status': evalData.healthStatus || '',
      'Health Remarks': evalData.healthRemarks || '',
      'Health Signature Name': evalData.healthSignatureName || '',
      'Health E-Signature': evalData.healthSignaturePath || '',
      'Approved Signature Name': evalData.approvedSignatureName || '',
      'Approved E-Signature': evalData.approvedSignaturePath || '',
      'Released Bike Plate': evalData.releasedBikePlate || '',
      'Released Signature Name': evalData.releasedSignatureName || '',
      'Released E-Signature': evalData.releasedSignaturePath || ''
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
      'General Weighted Average Document': selectedApp.gwaDocumentPath || '',
      'Extra Curricular Activities': selectedApp.extracurricularActivities || '',
      'Created At': formatDate(selectedApp.createdAt),
      'Eligibility Status': evalData.eligibilityStatus || '',
      'Eligibility Remarks': evalData.eligibilityRemarks || '',
      'Eligibility Signature Name': evalData.eligibilitySignatureName || '',
      'Eligibility E-Signature': evalData.eligibilitySignaturePath || '',
      'Ranking Score': evalData.rankingScore || '',
      'Ranking Recommended': evalData.rankingRecommended === true ? 'Yes' : evalData.rankingRecommended === false ? 'No' : '',
      'Ranking Signature Name': evalData.rankingSignatureName || '',
      'Ranking E-Signature': evalData.rankingSignaturePath || '',
      'Health Status': evalData.healthStatus || '',
      'Health Remarks': evalData.healthRemarks || '',
      'Health Signature Name': evalData.healthSignatureName || '',
      'Health E-Signature': evalData.healthSignaturePath || '',
      'Approved Signature Name': evalData.approvedSignatureName || '',
      'Approved E-Signature': evalData.approvedSignaturePath || '',
      'Released Bike Plate': evalData.releasedBikePlate || '',
      'Released Signature Name': evalData.releasedSignatureName || '',
      'Released E-Signature': evalData.releasedSignaturePath || ''
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
  const handlePDFExport = async () => {
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
        ['Intended Duration (Other):', selectedApp.intendedDurationOther || '-'],
        ['Extra Curricular Activities:', selectedApp.extracurricularActivities || '-']
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
        ['General Weighted Average:', selectedApp.gwaDocumentPath ? 'Uploaded' : 'Not provided']
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
    
    // Evaluation Form Section
    if (selectedApp.evaluation) {
      yPosition += 10;
      
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 30;
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Evaluation Form', margin, yPosition);
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Eligibility Section
      doc.setFont('helvetica', 'bold');
      doc.text('Evaluated and Recommended by (As to Eligibility)', margin, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      
      const eligibilityInfo = [
        ['Status:', selectedApp.evaluation.eligibilityStatus || '-'],
        ['Remarks:', selectedApp.evaluation.eligibilityRemarks || '-'],
        ['Signature Name:', selectedApp.evaluation.eligibilitySignatureName || '-']
      ];
      
      eligibilityInfo.forEach(([label, value]) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 30;
        }
        doc.text(label, margin, yPosition);
        doc.text(value, margin + 50, yPosition);
        yPosition += 6;
      });
      
      // Add e-signature image if available
      const eligibilitySigPath = selectedApp.evaluation?.eligibilitySignaturePath;
      if (eligibilitySigPath) {
        yPosition += 3;
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 30;
        }
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = eligibilitySigPath;
          await new Promise((resolve) => {
            img.onload = () => {
              try {
                const imgWidth = 40;
                const imgHeight = (img.height / img.width) * imgWidth;
                doc.addImage(img, 'PNG', margin + 50, yPosition, imgWidth, imgHeight);
                yPosition += imgHeight + 5;
              } catch (e) {
                doc.text('E-Signature: ' + eligibilitySigPath, margin + 50, yPosition);
                yPosition += 6;
              }
              resolve(null);
            };
            img.onerror = () => {
              doc.text('E-Signature: ' + eligibilitySigPath, margin + 50, yPosition);
              yPosition += 6;
              resolve(null);
            };
            setTimeout(() => {
              if (!img.complete) {
                doc.text('E-Signature: ' + eligibilitySigPath, margin + 50, yPosition);
                yPosition += 6;
                resolve(null);
              }
            }, 2000);
          });
        } catch (e) {
          doc.text('E-Signature: ' + eligibilitySigPath, margin + 50, yPosition);
          yPosition += 6;
        }
      }
      
      yPosition += 5;
      
      // Ranking Section (students only)
      if (!isStaff) {
        if (yPosition > 250) {
          doc.addPage();
          yPosition = 30;
        }
        doc.setFont('helvetica', 'bold');
        doc.text('As to Ranking', margin, yPosition);
        yPosition += 8;
        doc.setFont('helvetica', 'normal');
        
        const rankingInfo = [
          ['Score:', selectedApp.evaluation.rankingScore || '-'],
          ['Recommended:', selectedApp.evaluation.rankingRecommended === true ? 'Yes' : selectedApp.evaluation.rankingRecommended === false ? 'No' : '-'],
          ['Signature Name:', selectedApp.evaluation.rankingSignatureName || '-']
        ];
        
        rankingInfo.forEach(([label, value]) => {
          if (yPosition > 270) {
            doc.addPage();
            yPosition = 30;
          }
          doc.text(label, margin, yPosition);
          doc.text(value, margin + 50, yPosition);
          yPosition += 6;
        });
        
        // Add e-signature image if available
        const rankingSigPath = selectedApp.evaluation?.rankingSignaturePath;
        if (rankingSigPath) {
          yPosition += 3;
          if (yPosition > 240) {
            doc.addPage();
            yPosition = 30;
          }
          try {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = rankingSigPath;
            await new Promise((resolve) => {
              img.onload = () => {
                try {
                  const imgWidth = 40;
                  const imgHeight = (img.height / img.width) * imgWidth;
                  doc.addImage(img, 'PNG', margin + 50, yPosition, imgWidth, imgHeight);
                  yPosition += imgHeight + 5;
                } catch (e) {
                  doc.text('E-Signature: ' + rankingSigPath, margin + 50, yPosition);
                  yPosition += 6;
                }
                resolve(null);
              };
              img.onerror = () => {
                doc.text('E-Signature: ' + rankingSigPath, margin + 50, yPosition);
                yPosition += 6;
                resolve(null);
              };
              setTimeout(() => {
                if (!img.complete) {
                  doc.text('E-Signature: ' + rankingSigPath, margin + 50, yPosition);
                  yPosition += 6;
                  resolve(null);
                }
              }, 2000);
            });
          } catch (e) {
            doc.text('E-Signature: ' + rankingSigPath, margin + 50, yPosition);
            yPosition += 6;
          }
        }
        
        yPosition += 5;
      }
      
      // Health Section
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 30;
      }
      doc.setFont('helvetica', 'bold');
      doc.text('Certified (Health Services)', margin, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      
      const healthInfo = [
        ['Status:', selectedApp.evaluation.healthStatus || '-'],
        ['Remarks:', selectedApp.evaluation.healthRemarks || '-'],
        ['Signature Name:', selectedApp.evaluation.healthSignatureName || '-']
      ];
      
      healthInfo.forEach(([label, value]) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 30;
        }
        doc.text(label, margin, yPosition);
        doc.text(value, margin + 50, yPosition);
        yPosition += 6;
      });
      
      // Add e-signature image if available
      const healthSigPath = selectedApp.evaluation?.healthSignaturePath;
      if (healthSigPath) {
        yPosition += 3;
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 30;
        }
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = healthSigPath;
          await new Promise((resolve) => {
            img.onload = () => {
              try {
                const imgWidth = 40;
                const imgHeight = (img.height / img.width) * imgWidth;
                doc.addImage(img, 'PNG', margin + 50, yPosition, imgWidth, imgHeight);
                yPosition += imgHeight + 5;
              } catch (e) {
                doc.text('E-Signature: ' + healthSigPath, margin + 50, yPosition);
                yPosition += 6;
              }
              resolve(null);
            };
            img.onerror = () => {
              doc.text('E-Signature: ' + healthSigPath, margin + 50, yPosition);
              yPosition += 6;
              resolve(null);
            };
            setTimeout(() => {
              if (!img.complete) {
                doc.text('E-Signature: ' + healthSigPath, margin + 50, yPosition);
                yPosition += 6;
                resolve(null);
              }
            }, 2000);
          });
        } catch (e) {
          doc.text('E-Signature: ' + healthSigPath, margin + 50, yPosition);
          yPosition += 6;
        }
      }
      
      yPosition += 5;
      
      // Approved Section
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 30;
      }
      doc.setFont('helvetica', 'bold');
      doc.text('Approved by', margin, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      
      const approvedInfo = [
        ['Signature Name:', selectedApp.evaluation.approvedSignatureName || '-']
      ];
      
      approvedInfo.forEach(([label, value]) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 30;
        }
        doc.text(label, margin, yPosition);
        doc.text(value, margin + 50, yPosition);
        yPosition += 6;
      });
      
      // Add e-signature image if available
      const approvedSigPath = selectedApp.evaluation?.approvedSignaturePath;
      if (approvedSigPath) {
        yPosition += 3;
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 30;
        }
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = approvedSigPath;
          await new Promise((resolve) => {
            img.onload = () => {
              try {
                const imgWidth = 40;
                const imgHeight = (img.height / img.width) * imgWidth;
                doc.addImage(img, 'PNG', margin + 50, yPosition, imgWidth, imgHeight);
                yPosition += imgHeight + 5;
              } catch (e) {
                doc.text('E-Signature: ' + approvedSigPath, margin + 50, yPosition);
                yPosition += 6;
              }
              resolve(null);
            };
            img.onerror = () => {
              doc.text('E-Signature: ' + approvedSigPath, margin + 50, yPosition);
              yPosition += 6;
              resolve(null);
            };
            setTimeout(() => {
              if (!img.complete) {
                doc.text('E-Signature: ' + approvedSigPath, margin + 50, yPosition);
                yPosition += 6;
                resolve(null);
              }
            }, 2000);
          });
        } catch (e) {
          doc.text('E-Signature: ' + approvedSigPath, margin + 50, yPosition);
          yPosition += 6;
        }
      }
      
      yPosition += 5;
      
      // Released Section
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 30;
      }
      doc.setFont('helvetica', 'bold');
      doc.text('Released by', margin, yPosition);
      yPosition += 8;
      doc.setFont('helvetica', 'normal');
      
      const releasedInfo = [
        ['Bike Plate Number:', selectedApp.evaluation.releasedBikePlate || '-'],
        ['Signature Name:', selectedApp.evaluation.releasedSignatureName || '-']
      ];
      
      releasedInfo.forEach(([label, value]) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 30;
        }
        doc.text(label, margin, yPosition);
        doc.text(value, margin + 50, yPosition);
        yPosition += 6;
      });
      
      // Add e-signature image if available
      const releasedSigPath = selectedApp.evaluation?.releasedSignaturePath;
      if (releasedSigPath) {
        yPosition += 3;
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 30;
        }
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = releasedSigPath;
          await new Promise((resolve) => {
            img.onload = () => {
              try {
                const imgWidth = 40;
                const imgHeight = (img.height / img.width) * imgWidth;
                doc.addImage(img, 'PNG', margin + 50, yPosition, imgWidth, imgHeight);
                yPosition += imgHeight + 5;
              } catch (e) {
                doc.text('E-Signature: ' + releasedSigPath, margin + 50, yPosition);
                yPosition += 6;
              }
              resolve(null);
            };
            img.onerror = () => {
              doc.text('E-Signature: ' + releasedSigPath, margin + 50, yPosition);
              yPosition += 6;
              resolve(null);
            };
            setTimeout(() => {
              if (!img.complete) {
                doc.text('E-Signature: ' + releasedSigPath, margin + 50, yPosition);
                yPosition += 6;
                resolve(null);
              }
            }, 2000);
          });
        } catch (e) {
          doc.text('E-Signature: ' + releasedSigPath, margin + 50, yPosition);
          yPosition += 6;
        }
      }
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
            <div class="field" style="grid-column: 1 / -1;">
              <div class="field-label">Extra Curricular Activities</div>
              <div class="field-value">${app.extracurricularActivities || '-'}</div>
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
              <div class="field-label">General Weighted Average</div>
              <div class="field-value">${app.gwaDocumentPath ? 'Uploaded' : 'Not provided'}</div>
            </div>
            <div class="field">
              <div class="field-label">Extra Curricular Activities</div>
              <div class="field-value">${app.ecaDocumentPath ? 'Uploaded' : 'Not provided'}</div>
            </div>
          </div>
        </div>
        ` : ''}
        ${app.evaluation ? `
        <div class="section">
          <div class="section-title">Evaluation Form</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div style="border: 1px solid #d1d5db; border-radius: 8px; padding: 16px;">
              <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px;">Evaluated and Recommended by (As to Eligibility)</div>
              <div style="margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: bold;">Status:</span>
                <span style="margin-left: 8px;">${app.evaluation.eligibilityStatus || '-'}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: bold;">Remarks:</span>
                <span style="margin-left: 8px;">${app.evaluation.eligibilityRemarks || '-'}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: bold;">Signature Name:</span>
                <span style="margin-left: 8px;">${app.evaluation.eligibilitySignatureName || '-'}</span>
              </div>
              ${app.evaluation?.eligibilitySignaturePath ? `
              <div style="margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: bold;">E-Signature:</span>
                <img src="${app.evaluation.eligibilitySignaturePath}" alt="Eligibility Signature" style="max-width: 150px; max-height: 60px; margin-left: 8px; border: 1px solid #d1d5db; border-radius: 4px;" />
              </div>
              ` : ''}
            </div>
            
            ${!isStaff ? `
            <div style="border: 1px solid #d1d5db; border-radius: 8px; padding: 16px;">
              <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px;">As to Ranking</div>
              <div style="margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: bold;">Score:</span>
                <span style="margin-left: 8px;">${app.evaluation.rankingScore || '-'}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: bold;">Recommended:</span>
                <span style="margin-left: 8px;">${app.evaluation.rankingRecommended === true ? 'Yes' : app.evaluation.rankingRecommended === false ? 'No' : '-'}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: bold;">Signature Name:</span>
                <span style="margin-left: 8px;">${app.evaluation.rankingSignatureName || '-'}</span>
              </div>
              ${app.evaluation.rankingSignaturePath ? `
              <div style="margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: bold;">E-Signature:</span>
                <img src="${app.evaluation.rankingSignaturePath}" alt="Ranking Signature" style="max-width: 150px; max-height: 60px; margin-left: 8px; border: 1px solid #d1d5db; border-radius: 4px;" />
              </div>
              ` : ''}
            </div>
            ` : ''}
            
            <div style="border: 1px solid #d1d5db; border-radius: 8px; padding: 16px;">
              <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px;">Certified (Health Services)</div>
              <div style="margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: bold;">Status:</span>
                <span style="margin-left: 8px;">${app.evaluation.healthStatus || '-'}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: bold;">Remarks:</span>
                <span style="margin-left: 8px;">${app.evaluation.healthRemarks || '-'}</span>
              </div>
              <div style="margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: bold;">Signature Name:</span>
                <span style="margin-left: 8px;">${app.evaluation.healthSignatureName || '-'}</span>
              </div>
              ${app.evaluation.healthSignaturePath ? `
              <div style="margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: bold;">E-Signature:</span>
                <img src="${app.evaluation.healthSignaturePath}" alt="Health Signature" style="max-width: 150px; max-height: 60px; margin-left: 8px; border: 1px solid #d1d5db; border-radius: 4px;" />
              </div>
              ` : ''}
            </div>
            
            <div style="border: 1px solid #d1d5db; border-radius: 8px; padding: 16px;">
              <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px;">Approved by</div>
              <div style="margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: bold;">Signature Name:</span>
                <span style="margin-left: 8px;">${app.evaluation.approvedSignatureName || '-'}</span>
              </div>
              ${app.evaluation.approvedSignaturePath ? `
              <div style="margin-bottom: 8px;">
                <span style="font-size: 12px; font-weight: bold;">E-Signature:</span>
                <img src="${app.evaluation.approvedSignaturePath}" alt="Approved Signature" style="max-width: 150px; max-height: 60px; margin-left: 8px; border: 1px solid #d1d5db; border-radius: 4px;" />
              </div>
              ` : ''}
            </div>
          </div>
          
          <div style="border: 1px solid #d1d5db; border-radius: 8px; padding: 16px; margin-top: 20px;">
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 12px;">Released by</div>
            <div style="margin-bottom: 8px;">
              <span style="font-size: 12px; font-weight: bold;">Bike Plate Number:</span>
              <span style="margin-left: 8px;">${app.evaluation.releasedBikePlate || '-'}</span>
            </div>
            <div style="margin-bottom: 8px;">
              <span style="font-size: 12px; font-weight: bold;">Signature Name:</span>
              <span style="margin-left: 8px;">${app.evaluation.releasedSignatureName || '-'}</span>
            </div>
            ${app.evaluation.releasedSignaturePath ? `
            <div style="margin-bottom: 8px;">
              <span style="font-size: 12px; font-weight: bold;">E-Signature:</span>
              <img src="${app.evaluation.releasedSignaturePath}" alt="Released Signature" style="max-width: 150px; max-height: 60px; margin-left: 8px; border: 1px solid #d1d5db; border-radius: 4px;" />
            </div>
            ` : ''}
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
      const evalData = app.evaluation || {};
      
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
        'Created At': formatDate(app.createdAt),
        'Eligibility Status': evalData.eligibilityStatus || '',
        'Eligibility Remarks': evalData.eligibilityRemarks || '',
        'Eligibility Signature Name': evalData.eligibilitySignatureName || '',
        'Eligibility E-Signature': evalData.eligibilitySignaturePath || '',
        'Health Status': evalData.healthStatus || '',
        'Health Remarks': evalData.healthRemarks || '',
        'Health Signature Name': evalData.healthSignatureName || '',
        'Health E-Signature': evalData.healthSignaturePath || '',
        'Approved Signature Name': evalData.approvedSignatureName || '',
        'Approved E-Signature': evalData.approvedSignaturePath || '',
        'Released Bike Plate': evalData.releasedBikePlate || '',
        'Released Signature Name': evalData.releasedSignatureName || '',
        'Released E-Signature': evalData.releasedSignaturePath || ''
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
          'General Weighted Average Document': '',
          'Extra Curricular Activities': '',
          'Ranking Score': '',
          'Ranking Recommended': '',
          'Ranking Signature Name': '',
          'Ranking E-Signature': ''
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
          'General Weighted Average Document': app.gwaDocumentPath || '',
          'Extra Curricular Activities': app.extracurricularActivities || '',
          'Ranking Score': evalData.rankingScore || '',
          'Ranking Recommended': evalData.rankingRecommended === true ? 'Yes' : evalData.rankingRecommended === false ? 'No' : '',
          'Ranking Signature Name': evalData.rankingSignatureName || '',
          'Ranking E-Signature': evalData.rankingSignaturePath || '',
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
                          <div style={{ gridColumn: '1 / -1' }}>
                            <Field label="Extra Curricular Activities" value={selectedApp.extracurricularActivities || '-'} />
                          </div>
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
                        {selectedApp.itrDocumentPath && (
                          <DocCard title="ITR" url={selectedApp.itrDocumentPath} />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Evaluation Section */}
                  <div style={{ marginTop: 16, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: '#1f2937' }}>EVALUATION FORM</div>
                      {selectedApp.status === 'pending' && !isEvaluationComplete(selectedApp) && (
                        <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, padding: '6px 12px', background: '#fef2f2', borderRadius: 6, border: '1px solid #fecaca' }}>
                          ⚠️ Complete evaluation before accepting
                        </div>
                      )}
                    </div>
                    
                    {/* Grid layout for 4 sections */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                      {/* Section 1: Evaluated and Recommended by (As to Eligibility) */}
                      <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', marginBottom: 12 }}>Evaluated and Recommended by:</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>As to Eligibility</div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="eligibilityStatus"
                              value="eligible"
                              checked={evaluationData.eligibilityStatus === 'eligible'}
                              onChange={(e) => setEvaluationData({ ...evaluationData, eligibilityStatus: 'eligible' })}
                              style={{ cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: 14 }}>Eligible</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="eligibilityStatus"
                              value="notEligible"
                              checked={evaluationData.eligibilityStatus === 'notEligible'}
                              onChange={(e) => setEvaluationData({ ...evaluationData, eligibilityStatus: 'notEligible' })}
                              style={{ cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: 14 }}>Not Eligible</span>
                          </label>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Remarks:</label>
                          <input
                            type="text"
                            value={evaluationData.eligibilityRemarks}
                            onChange={(e) => setEvaluationData({ ...evaluationData, eligibilityRemarks: e.target.value })}
                            style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, background: '#fff', color: '#374151' }}
                            placeholder="Enter remarks"
                          />
                        </div>
                        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                          <div style={{ marginBottom: 8 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Name:</label>
                            <input
                              type="text"
                              value={evaluationData.eligibilitySignatureName}
                              onChange={(e) => setEvaluationData({ ...evaluationData, eligibilitySignatureName: e.target.value })}
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, background: '#fff', color: '#374151' }}
                              placeholder="Enter name"
                            />
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>E-Signature:</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setSignatureFiles({ ...signatureFiles, eligibilitySignatureFile: file });
                              }}
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, background: '#fff' }}
                            />
                            {evaluationData.eligibilitySignaturePath && (
                              <a href={evaluationData.eligibilitySignaturePath} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#1976d2', marginTop: 4, display: 'block' }}>
                                View current signature
                              </a>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Sustainable Development Officer</div>
                        </div>
                      </div>

                      {/* Section 2: As to Ranking (for students only) */}
                      <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', marginBottom: 12 }}>As to Ranking (for students only)</div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Score:</label>
                          <input
                            type="text"
                            value={evaluationData.rankingScore}
                            onChange={(e) => setEvaluationData({ ...evaluationData, rankingScore: e.target.value })}
                            style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, background: '#fff', color: '#374151' }}
                            placeholder="Enter score"
                          />
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="rankingRecommended"
                              checked={evaluationData.rankingRecommended === true}
                              onChange={(e) => setEvaluationData({ ...evaluationData, rankingRecommended: true })}
                              style={{ cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: 13 }}>Recommended for the grant of the free use of 1 bicycle with all accessories</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="rankingRecommended"
                              checked={evaluationData.rankingRecommended === false}
                              onChange={(e) => setEvaluationData({ ...evaluationData, rankingRecommended: false })}
                              style={{ cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: 13 }}>Not recommended for the grant of the free use of 1 bicycle with all accessories</span>
                          </label>
                        </div>
                        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                          <div style={{ marginBottom: 8 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Name:</label>
                            <input
                              type="text"
                              value={evaluationData.rankingSignatureName}
                              onChange={(e) => setEvaluationData({ ...evaluationData, rankingSignatureName: e.target.value })}
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, background: '#fff', color: '#374151' }}
                              placeholder="Enter name"
                            />
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>E-Signature:</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setSignatureFiles({ ...signatureFiles, rankingSignatureFile: file });
                              }}
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, background: '#fff' }}
                            />
                            {evaluationData.rankingSignaturePath && (
                              <a href={evaluationData.rankingSignaturePath} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#1976d2', marginTop: 4, display: 'block' }}>
                                View current signature
                              </a>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Vice Chancellor for Academic Affairs</div>
                        </div>
                      </div>

                      {/* Section 3: Certified (Health Services) */}
                      <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', marginBottom: 12 }}>Certified:</div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="healthStatus"
                              value="fit"
                              checked={evaluationData.healthStatus === 'fit'}
                              onChange={(e) => setEvaluationData({ ...evaluationData, healthStatus: 'fit' })}
                              style={{ cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: 14 }}>Fit to use a bicycle</span>
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="healthStatus"
                              value="notFit"
                              checked={evaluationData.healthStatus === 'notFit'}
                              onChange={(e) => setEvaluationData({ ...evaluationData, healthStatus: 'notFit' })}
                              style={{ cursor: 'pointer' }}
                            />
                            <span style={{ fontSize: 14 }}>Not fit to use a bicycle</span>
                          </label>
                        </div>
                        <div style={{ marginBottom: 12 }}>
                          <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Remarks:</label>
                          <input
                            type="text"
                            value={evaluationData.healthRemarks}
                            onChange={(e) => setEvaluationData({ ...evaluationData, healthRemarks: e.target.value })}
                            style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, background: '#fff', color: '#374151' }}
                            placeholder="Enter remarks"
                          />
                        </div>
                        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                          <div style={{ marginBottom: 8 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Name:</label>
                            <input
                              type="text"
                              value={evaluationData.healthSignatureName}
                              onChange={(e) => setEvaluationData({ ...evaluationData, healthSignatureName: e.target.value })}
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, background: '#fff', color: '#374151' }}
                              placeholder="Enter name"
                            />
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>E-Signature:</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setSignatureFiles({ ...signatureFiles, healthSignatureFile: file });
                              }}
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, background: '#fff' }}
                            />
                            {evaluationData.healthSignaturePath && (
                              <a href={evaluationData.healthSignaturePath} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#1976d2', marginTop: 4, display: 'block' }}>
                                View current signature
                              </a>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Director/Head, Health Services Office</div>
                        </div>
                      </div>

                      {/* Section 4: Approved by */}
                      <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 16 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', marginBottom: 12 }}>Approved by:</div>
                        <div style={{ marginTop: 16, paddingTop: 12 }}>
                          <div style={{ marginBottom: 8 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Name:</label>
                            <input
                              type="text"
                              value={evaluationData.approvedSignatureName}
                              onChange={(e) => setEvaluationData({ ...evaluationData, approvedSignatureName: e.target.value })}
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, background: '#fff', color: '#374151' }}
                              placeholder="Enter name"
                            />
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>E-Signature:</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0] || null;
                                setSignatureFiles({ ...signatureFiles, approvedSignatureFile: file });
                              }}
                              style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, background: '#fff' }}
                            />
                            {evaluationData.approvedSignaturePath && (
                              <a href={evaluationData.approvedSignaturePath} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#1976d2', marginTop: 4, display: 'block' }}>
                                View current signature
                              </a>
                            )}
                          </div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Chancellor/Vice President for Administration and Finance</div>
                        </div>
                      </div>
                    </div>

                    {/* Section 5: Released by */}
                    <div style={{ border: '1px solid #d1d5db', borderRadius: 8, padding: 16, marginTop: 20 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#1f2937', marginBottom: 12 }}>Released by:</div>
                      <div style={{ marginBottom: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14 }}>1 bicycle with plate number</span>
                          <input
                            type="text"
                            value={evaluationData.releasedBikePlate || ''}
                            onChange={(e) => setEvaluationData({ ...evaluationData, releasedBikePlate: e.target.value })}
                            style={{ flex: 1, padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, maxWidth: 150, background: '#fff', color: '#374151' }}
                            placeholder="Enter plate number"
                          />
                          <span style={{ fontSize: 14 }}>, helmet, tumbler, and air pump</span>
                        </label>
                      </div>
                      <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #e5e7eb' }}>
                        <div style={{ marginBottom: 8 }}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Name:</label>
                          <input
                            type="text"
                            value={evaluationData.releasedSignatureName}
                            onChange={(e) => setEvaluationData({ ...evaluationData, releasedSignatureName: e.target.value })}
                            style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, background: '#fff', color: '#374151' }}
                            placeholder="Enter name"
                          />
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#374151' }}>E-Signature:</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setSignatureFiles({ ...signatureFiles, releasedSignatureFile: file });
                            }}
                            style={{ width: '100%', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: 4, fontSize: 13, background: '#fff' }}
                          />
                          {evaluationData.releasedSignaturePath && (
                            <a href={evaluationData.releasedSignaturePath} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#1976d2', marginTop: 4, display: 'block' }}>
                              View current signature
                            </a>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Assistant Director/Head, General Services Office</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSaveEvaluation(selectedApp.id)}
                      disabled={savingEvaluation}
                      style={{
                        marginTop: 20,
                        padding: '12px 24px',
                        borderRadius: 8,
                        border: 'none',
                        background: savingEvaluation ? '#9ca3af' : '#1976d2',
                        color: '#fff',
                        fontWeight: 600,
                        cursor: savingEvaluation ? 'not-allowed' : 'pointer',
                        fontSize: 14,
                        width: '100%',
                      }}
                    >
                      {savingEvaluation ? 'Saving...' : 'Save Evaluation'}
                    </button>
                  </div>
                </div>
                <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', borderTop: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {selectedApp.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(selectedApp.id, 'approved')}
                          disabled={!isEvaluationComplete(selectedApp)}
                          style={{ 
                            padding: '8px 16px', 
                            borderRadius: 8, 
                            border: 'none', 
                            background: isEvaluationComplete(selectedApp) ? '#22c55e' : '#9ca3af', 
                            color: '#fff', 
                            fontWeight: 700, 
                            cursor: isEvaluationComplete(selectedApp) ? 'pointer' : 'not-allowed',
                            opacity: isEvaluationComplete(selectedApp) ? 1 : 0.6
                          }}
                          title={!isEvaluationComplete(selectedApp) ? 'Please complete the evaluation form before accepting' : ''}
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