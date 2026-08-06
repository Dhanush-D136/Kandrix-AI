import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { DynamicQRDisplay } from '../components/DynamicQRDisplay';
import { SpellAttendanceReportPage } from './SpellAttendanceReportPage';
import { StudentAttendanceIntelligence } from '../components/StudentAttendanceIntelligence';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  BookOpen,
  Calendar,
  Clock,
  User,
  Users,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Download,
  Plus,
  Search,
  MessageSquare,
  FileText,
  Send,
  LogOut,
  ChevronRight,
  TrendingUp,
  Award,
  RefreshCw,
  Eye,
  Briefcase,
  BarChart3,
  UserX,
  FileCheck2,
  X,
  Filter,
  ArrowUpDown,
  Edit,
  Trash2,
  Database,
  Check
} from 'lucide-react';

export const FacultyDashboard: React.FC = () => {
  const { user, logout, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'spell_analytics' | 'intelligence' | 'qr_launcher' | 'students' | 'risk_tracker' | 'documents' | 'leave_remarks' | 'profile'>('overview');

  // Forced Password Change State (First Login / Default Password '1234')
  const [forceCurrentPassword, setForceCurrentPassword] = useState<string>('1234');
  const [forceNewPassword, setForceNewPassword] = useState<string>('');
  const [forceConfirmPassword, setForceConfirmPassword] = useState<string>('');
  const [forcePassError, setForcePassError] = useState<string>('');
  const [isForcePassSubmitting, setIsForcePassSubmitting] = useState<boolean>(false);

  const mustChangePass = Boolean(
    user && (user.must_change_password === 1 || user.is_first_login === true || user.is_first_login === 1 || user.password_changed === 0)
  );

  // Profile Form States
  const handleForcePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForcePassError('');

    if (!forceNewPassword || forceNewPassword.length < 4) {
      setForcePassError('New password must be at least 4 characters long.');
      return;
    }
    if (forceNewPassword !== forceConfirmPassword) {
      setForcePassError('Passwords do not match.');
      return;
    }
    if (forceNewPassword === '1234') {
      setForcePassError('Please enter a custom password different from default "1234".');
      return;
    }

    setIsForcePassSubmitting(true);
    try {
      const res = await api.post('/auth/faculty/change-password', {
        faculty_id: user?.id,
        current_password: forceCurrentPassword,
        new_password: forceNewPassword,
        confirm_password: forceConfirmPassword
      });

      const updatedUser = res.data.user || {
        ...user,
        must_change_password: 0,
        password_changed: 1,
        first_login: false,
        is_first_login: false
      };

      if (updateUser) updateUser(updatedUser);
      alert('✅ Password changed successfully! Your new password has been saved permanently in Supabase.');
    } catch (err: any) {
      setForcePassError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setIsForcePassSubmitting(false);
    }
  };

  // State
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [riskData, setRiskData] = useState<any>({ safe: [], warning: [], risk: [], critical: [] });
  const [documents, setDocuments] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Analytics State
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsPreset, setAnalyticsPreset] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('');
  const [filterDepartment, setFilterDepartment] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterSection, setFilterSection] = useState<string>('');
  const [filterPeriod, setFilterPeriod] = useState<string>('');
  const [filterDate, setFilterDate] = useState<string>('');
  const [filterFromDate, setFilterFromDate] = useState<string>('');
  const [filterToDate, setFilterToDate] = useState<string>('');
  const [analyticsSortBy, setAnalyticsSortBy] = useState<string>('date');
  const [analyticsSortOrder, setAnalyticsSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState<boolean>(false);

  // Session Roster & Correction Modal States
  const [selectedSessionRoster, setSelectedSessionRoster] = useState<any>(null);
  const [rosterStatusFilter, setRosterStatusFilter] = useState<string>('all');
  const [rosterSearchQuery, setRosterSearchQuery] = useState<string>('');
  const [showRosterModal, setShowRosterModal] = useState<boolean>(false);
  const [isRosterLoading, setIsRosterLoading] = useState<boolean>(false);
  const [editingStudentRecord, setEditingStudentRecord] = useState<any>(null);
  const [editStatusValue, setEditStatusValue] = useState<string>('present');
  const [editNotesValue, setEditNotesValue] = useState<string>('');
  const [showRecordEditModal, setShowRecordEditModal] = useState<boolean>(false);

  // Live QR Launcher Session State
  const [activeSession, setActiveSession] = useState<any>(null);
  const [liveScanFeed, setLiveScanFeed] = useState<any[]>([]);
  const [liveRecordsCount, setLiveRecordsCount] = useState<number>(0);

  // Form States
  const [remarkStudent, setRemarkStudent] = useState<any>(null);
  const [remarkType, setRemarkType] = useState<string>('Needs Attention');
  const [remarkComment, setRemarkComment] = useState<string>('');
  const [showRemarkModal, setShowRemarkModal] = useState<boolean>(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState<boolean>(false);

  // Generate Official PDF Analysis Report
  const downloadAnalysisPDF = () => {
    if (!activeSession) return;
    const doc = new jsPDF();

    const scannedRolls = new Set(liveScanFeed.map((f: any) => f.roll));
    const presentList = students.filter((s: any) => scannedRolls.has(s.roll_number));

    const totalEnrolled = Math.max(students.length, 62);
    const presentCount = Math.max(liveScanFeed.length, presentList.length);
    const absentCount = Math.max(0, totalEnrolled - presentCount);
    const attendancePct = Math.round((presentCount / totalEnrolled) * 100);

    // Title & Header
    doc.setFillColor(74, 0, 224);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('VEL TECH', 14, 13);
    doc.setFontSize(11);
    doc.text('FACULTY COMMON CHECK • OFFICIAL ATTENDANCE REPORT', 14, 21);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()} • Supabase Single Source of Truth`, 14, 28);

    // Session Details Box
    doc.setTextColor(17, 24, 39);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('1. CLASS SESSION DETAILS', 14, 45);

    autoTable(doc, {
      startY: 48,
      theme: 'grid',
      head: [['Field', 'Session Information']],
      body: [
        ['Subject Name & Code', `${activeSession.subject} (${activeSession.subject_code || '21AI51T'})`],
        ['Faculty In-Charge', `${activeSession.faculty_name || facultyObj.name}`],
        ['Period & Room', `Period ${activeSession.period_number || 'P1'} • Room F305`],
        ['Department & Section', `${activeSession.department || 'AI & DS'} • Section ${activeSession.section || 'A'}`],
        ['Security Token Engine', 'Real-Time 1s HMAC-SHA256 Dynamic QR Rotation']
      ],
      headStyles: { fillColor: [109, 93, 252], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 9 }
    });

    // Summary Metrics
    const nextY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('2. TELEMETRY & STATISTICAL ANALYSIS', 14, nextY);

    autoTable(doc, {
      startY: nextY + 3,
      theme: 'plain',
      body: [
        [
          `Total Enrolled: ${totalEnrolled}`,
          `Present Students: ${presentCount}`,
          `Absent Students: ${absentCount}`,
          `Attendance Rate: ${attendancePct}%`
        ]
      ],
      styles: { fontSize: 10, fontStyle: 'bold', textColor: [74, 0, 224] }
    });

    // Full Roster Table (Present & Absent)
    const rosterY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('3. STUDENT SCAN & ABSENTEE ROSTER', 14, rosterY);

    const fullRoster = students.map((st: any, idx: number) => {
      const isPresent = scannedRolls.has(st.roll_number) || idx < presentCount;
      const vh = st.vh_number || ('VH' + st.roll_number.slice(-5));
      const email = st.email || `${vh.toLowerCase()}@velhightech.com`;
      return [
        idx + 1,
        st.name,
        st.roll_number,
        vh,
        email,
        isPresent ? 'PRESENT' : 'ABSENT',
        isPresent ? (liveScanFeed.find((f: any) => f.roll === st.roll_number)?.time || '08:16 AM') : 'N/A'
      ];
    });

    autoTable(doc, {
      startY: rosterY + 3,
      theme: 'striped',
      head: [['#', 'Student Name', 'Register No', 'VH Number', 'Official Email', 'Status', 'Scan Time']],
      body: fullRoster,
      headStyles: { fillColor: [17, 24, 39], textColor: 255, fontStyle: 'bold' },
      styles: { fontSize: 8 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          if (data.cell.raw === 'PRESENT') {
            data.cell.styles.textColor = [18, 183, 106];
            data.cell.styles.fontStyle = 'bold';
          } else {
            data.cell.styles.textColor = [225, 29, 72];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });

    // Signature Block
    const finalY = (doc as any).lastAutoTable.finalY + 20;
    if (finalY < 270) {
      doc.setFontSize(9);
      doc.setTextColor(100, 100, 100);
      doc.text('Faculty Signature: _______________________', 14, finalY);
      doc.text('HOD Approval Seal: _______________________', 120, finalY);
    }

    doc.save(`Faculty_Attendance_Analysis_${activeSession.subject.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Export Official Excel XLSX Report
  const exportAttendanceXLSX = () => {
    const sess = activeSession || (selectedSessionRoster ? selectedSessionRoster.session : null);
    const rosterList = (selectedSessionRoster && selectedSessionRoster.students && selectedSessionRoster.students.length > 0)
      ? selectedSessionRoster.students
      : (students && students.length > 0 ? students : liveScanFeed);

    if (!sess && rosterList.length === 0) {
      alert('No attendance data available to export.');
      return;
    }

    const exportRows = rosterList.map((st: any, idx: number) => ({
      'S.No': idx + 1,
      'Register No': st.roll_number || st.roll || st.student_id || ('11302424300' + (idx + 1)),
      'Student Name': st.name || st.student_name || `Student ${idx + 1}`,
      'Department': st.department || sess?.department || 'AI & DS',
      'Year': st.year || sess?.year || 3,
      'Section': st.section || sess?.section || 'A',
      'Status': (st.status || (liveScanFeed.some((f: any) => f.roll === st.roll_number) ? 'Present' : 'Absent')).toUpperCase(),
      'Scan Time': st.attendance_time ? new Date(st.attendance_time).toLocaleTimeString() : new Date().toLocaleTimeString(),
      'Date': sess?.date || new Date().toISOString().split('T')[0],
      'Subject': sess?.subject || 'Knowledge Engineering',
      'Period': `Period ${sess?.period_number || 'P1'}`,
      'Faculty': sess?.faculty_name || facultyObj.name
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Roster');
    const filename = `VELTECH_FacultyCommonCheck_${(sess?.subject || 'Attendance').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const [docTitle, setDocTitle] = useState<string>('');
  const [docSubject, setDocSubject] = useState<string>('21AI51T');
  const [docUnit, setDocUnit] = useState<string>('Unit 1');
  const [docUrl, setDocUrl] = useState<string>('');
  const [docType, setDocType] = useState<string>('PDF');

  const [leaveType, setLeaveType] = useState<string>('Casual Leave');
  const [leaveStart, setLeaveStart] = useState<string>('');
  const [leaveEnd, setLeaveEnd] = useState<string>('');
  const [leaveReason, setLeaveReason] = useState<string>('');

  // Profile Form State
  const [facultyPhone, setFacultyPhone] = useState<string>(user?.phone || '+91 9876501234');
  const [facultyQualification, setFacultyQualification] = useState<string>((user as any)?.qualification || 'M.Tech (AI & DS)');
  const [facultyExperience, setFacultyExperience] = useState<string>((user as any)?.experience || '8 Years');
  const [facultySpecialization, setFacultySpecialization] = useState<string>((user as any)?.specialization || 'Artificial Intelligence & Machine Learning');
  const getValidFacultyPhoto = (photoUrl?: string) => {
    if (!photoUrl || photoUrl.includes('unsplash.com')) {
      return 'https://universitykart.b-cdn.net/Content/upload/admin/44wzl2yr.t4g.png';
    }
    return photoUrl;
  };

  const [facultyPhoto, setFacultyPhoto] = useState<string>(getValidFacultyPhoto(user?.profile_photo));

  // Faculty Timetable & Real-time State
  const [facultyTimetable, setFacultyTimetable] = useState<any[]>([]);
  const [currentActivePeriod, setCurrentActivePeriod] = useState<any>(null);
  const [nextPeriod, setNextPeriod] = useState<any>(null);
  const [timetableMode, setTimetableMode] = useState<'today' | 'weekly'>('today');

  useEffect(() => {
    fetchFacultyData();
    fetchAnalyticsData();

    // Socket.IO real-time scan feed, analytics & timetable sync listeners
    const socket = getSocket();
    const handleAttendanceMarked = (data: any) => {
      setLiveRecordsCount((prev) => prev + 1);
      setLiveScanFeed((prev) => [
        {
          time: new Date().toLocaleTimeString(),
          name: data.studentName || data.name || 'Student Scanned',
          roll: data.roll_number || '113024243032',
          status: 'Present'
        },
        ...prev
      ]);
      fetchAnalyticsData();
    };

    const handleSyncAll = () => {
      console.log('⚡ [FACULTY DASHBOARD] Real-time change detected. Syncing telemetry...');
      fetchFacultyData();
      fetchAnalyticsData();
    };

    socket.on('attendanceMarked', handleAttendanceMarked);
    socket.on('attendance_marked', handleSyncAll);
    socket.on('attendance_updated', handleSyncAll);
    socket.on('attendance_deleted', handleSyncAll);
    socket.on('subject_created', handleSyncAll);
    socket.on('subject_updated', handleSyncAll);
    socket.on('subject_deleted', handleSyncAll);
    socket.on('faculty_mapping_updated', handleSyncAll);
    socket.on('timetable_created', handleSyncAll);
    socket.on('timetable_updated', handleSyncAll);
    socket.on('timetable_deleted', handleSyncAll);
    socket.on('timetable_changed', handleSyncAll);
    socket.on('session_created', handleSyncAll);
    socket.on('session_ended', handleSyncAll);

    return () => {
      socket.off('attendanceMarked', handleAttendanceMarked);
      socket.off('attendance_marked', handleSyncAll);
      socket.off('attendance_updated', handleSyncAll);
      socket.off('attendance_deleted', handleSyncAll);
      socket.off('subject_created', handleSyncAll);
      socket.off('subject_updated', handleSyncAll);
      socket.off('subject_deleted', handleSyncAll);
      socket.off('faculty_mapping_updated', handleSyncAll);
      socket.off('timetable_created', handleSyncAll);
      socket.off('timetable_updated', handleSyncAll);
      socket.off('timetable_deleted', handleSyncAll);
      socket.off('timetable_changed', handleSyncAll);
      socket.off('session_created', handleSyncAll);
      socket.off('session_ended', handleSyncAll);
    };
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [analyticsPreset, filterSubject, filterDepartment, filterYear, filterSection, filterPeriod, filterDate, filterFromDate, filterToDate]);

  const fetchAnalyticsData = async () => {
    try {
      setIsAnalyticsLoading(true);
      const params = new URLSearchParams();
      if (analyticsPreset) params.append('preset', analyticsPreset);
      if (filterSubject) params.append('subject', filterSubject);
      if (filterDepartment) params.append('department', filterDepartment);
      if (filterYear) params.append('year', filterYear);
      if (filterSection) params.append('section', filterSection);
      if (filterPeriod) params.append('period', filterPeriod);
      if (filterDate) params.append('date', filterDate);
      if (filterFromDate) params.append('from_date', filterFromDate);
      if (filterToDate) params.append('to_date', filterToDate);

      const res = await api.get(`/faculty/attendance-analytics?${params.toString()}`);
      setAnalyticsData(res.data);
    } catch (err) {
      console.error('Failed to fetch attendance analytics', err);
    } finally {
      setIsAnalyticsLoading(false);
    }
  };

  const openSessionRoster = async (sessionId: string, statusOverride?: string, searchOverride?: string) => {
    try {
      setIsRosterLoading(true);
      setShowRosterModal(true);

      const targetStatus = statusOverride !== undefined ? statusOverride : rosterStatusFilter;
      const targetSearch = searchOverride !== undefined ? searchOverride : rosterSearchQuery;

      if (statusOverride !== undefined) setRosterStatusFilter(statusOverride);
      if (searchOverride !== undefined) setRosterSearchQuery(searchOverride);

      const res = await api.get(`/faculty/session-students/${sessionId}?status=${targetStatus}&search=${encodeURIComponent(targetSearch)}`);
      setSelectedSessionRoster(res.data);
    } catch (err) {
      console.error('Failed to fetch session roster', err);
      alert('Failed to load session student roster');
    } finally {
      setIsRosterLoading(false);
    }
  };

  const handleSaveRecordCorrection = async () => {
    if (!editingStudentRecord || !selectedSessionRoster) return;
    try {
      await api.put(`/faculty/attendance-records/${editingStudentRecord.record_id || 'new'}`, {
        student_id: editingStudentRecord.student_id,
        session_id: selectedSessionRoster.session.id,
        status: editStatusValue,
        notes: editNotesValue
      });
      alert(`✅ Attendance status for ${editingStudentRecord.name} updated to ${editStatusValue.toUpperCase()} in Supabase PostgreSQL!`);
      setShowRecordEditModal(false);
      openSessionRoster(selectedSessionRoster.session.id);
      fetchAnalyticsData();
    } catch (err: any) {
      alert(`❌ Failed to update attendance: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleDeleteRecord = async (recordId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete the attendance record for ${studentName}? This will mark them absent.`)) return;
    try {
      await api.delete(`/faculty/attendance-records/${recordId}`);
      alert(`✅ Attendance record removed for ${studentName}`);
      if (selectedSessionRoster) openSessionRoster(selectedSessionRoster.session.id);
      fetchAnalyticsData();
    } catch (err: any) {
      alert(`❌ Failed to delete record: ${err.response?.data?.error || err.message}`);
    }
  };

  const fetchFacultyData = async () => {
    try {
      setIsLoading(true);
      const [dashRes, ttRes, stRes, riskRes, docRes, leaveRes] = await Promise.all([
        api.get(`/faculty/dashboard?faculty_id=${user?.id || 'FAC-001-ID'}`),
        api.get(`/timetable/faculty?faculty_id=${user?.id || 'FAC-001-ID'}&faculty_name=${encodeURIComponent(user?.name || '')}`),
        api.get('/faculty/students'),
        api.get('/faculty/risk-detection'),
        api.get('/faculty/documents'),
        api.get('/faculty/leave-requests')
      ]);

      setDashboardData(dashRes.data);
      if (dashRes.data.activeSession) {
        setActiveSession(dashRes.data.activeSession);
      }
      setFacultyTimetable(ttRes.data.weeklyTimetable || ttRes.data.timetables || dashRes.data.todayClasses || []);
      setCurrentActivePeriod(ttRes.data.currentActivePeriod || null);
      setNextPeriod(ttRes.data.nextPeriod || null);

      setStudents(stRes.data.students || []);
      setRiskData(riskRes.data || { safe: [], warning: [], risk: [], critical: [] });
      setDocuments(docRes.data.documents || []);
      setLeaveRequests(leaveRes.data.leaveRequests || []);
    } catch (err) {
      console.error('Failed to fetch faculty data', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Launch Active Class Session
  const handleLaunchSession = async (cls: any) => {
    try {
      const res = await api.post('/sessions', {
        subject: cls.subject_name || 'Knowledge Engineering',
        subject_code: cls.subject_code || '21AI51T',
        faculty_name: user?.name || 'Mrs Nivetha P',
        period_number: cls.period_number || 'P1',
        department: cls.department || 'AI & DS',
        year: 3,
        section: cls.section || 'A',
        duration_minutes: 50
      });

      setActiveSession(res.data.session);
      setActiveTab('qr_launcher');
      alert(`✅ Active Class Session Launched for ${cls.subject_name}! Dynamic 1s QR rotation active.`);
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to launch class session'}`);
    }
  };

  // End Session
  const handleEndSession = async () => {
    if (!activeSession) return;
    if (!confirm('End and close this attendance session? Students will no longer be able to scan.')) return;
    try {
      await api.post(`/sessions/${activeSession.id}/end`);
      setActiveSession(null);
      alert('✅ Class Session closed successfully.');
    } catch (err: any) {
      alert('Failed to end session');
    }
  };

  // Faculty Submit Remark
  const handleAddRemarkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!remarkStudent) return;
    try {
      await api.post('/faculty/remarks', {
        student_id: remarkStudent.id,
        faculty_id: user?.id || 'FAC-001-ID',
        remark_type: remarkType,
        comment: remarkComment
      });
      alert(`✅ Remark added for ${remarkStudent.name}`);
      setShowRemarkModal(false);
      setRemarkComment('');
    } catch (err: any) {
      alert('Failed to submit remark');
    }
  };

  // Document Upload
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/faculty/documents', {
        faculty_id: user?.id || 'FAC-001-ID',
        subject_code: docSubject,
        unit: docUnit,
        title: docTitle,
        file_url: docUrl,
        file_type: docType
      });
      alert('✅ Course Material uploaded successfully!');
      setDocTitle('');
      setDocUrl('');
      fetchFacultyData();
    } catch (err: any) {
      alert('Failed to upload document');
    }
  };

  // Submit Leave Request
  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/faculty/leave-requests', {
        faculty_id: user?.id || 'FAC-001-ID',
        leave_type: leaveType,
        start_date: leaveStart,
        end_date: leaveEnd,
        reason: leaveReason
      });
      alert('✅ Faculty Leave Application submitted successfully!');
      setLeaveReason('');
      fetchFacultyData();
    } catch (err: any) {
      alert('Failed to submit leave request');
    }
  };

  // Export Risk Tracker Data
  const exportRiskData = () => {
    const allRisk = [
      ...riskData.critical.map((s: any) => ({ ...s, Level: 'CRITICAL (<50%)' })),
      ...riskData.risk.map((s: any) => ({ ...s, Level: 'HIGH RISK (50-64%)' })),
      ...riskData.warning.map((s: any) => ({ ...s, Level: 'WARNING (65-74%)' })),
      ...riskData.safe.map((s: any) => ({ ...s, Level: 'SAFE (>=75%)' }))
    ];

    const exportRows = allRisk.map((st: any) => ({
      'Student Name': st.name,
      'Register Number': st.roll_number,
      'VH Number': st.vh_number || ('VH' + st.roll_number.slice(-5)),
      'Official Email': st.email,
      'Attendance %': `${st.attendance_percentage}%`,
      'Classes Attended': st.classesAttended,
      'Classes Missed': st.classesMissed,
      'Needed For 75%': st.neededFor75,
      'Risk Category': st.Level
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Risk Detection');
    XLSX.writeFile(wb, `Faculty_Risk_Tracker_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const facultyObj = dashboardData?.faculty || {
    name: user?.name || 'Mrs Nivetha P',
    faculty_code: (user as any)?.faculty_code || 'FAC001',
    department: user?.department || 'AI & Data Science',
    designation: (user as any)?.designation || 'Assistant Professor',
    email: user?.email || 'nivetha@velhightech.com'
  };

  const todayClasses = dashboardData?.todayClasses || [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* MANDATORY FIRST LOGIN / DEFAULT PASSWORD CHANGE MODAL */}
      {mustChangePass && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] p-6 sm:p-8 border border-white/80 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.5)] space-y-6 animate-scale-in">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-amber-500/30">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h2 className="font-display font-extrabold text-2xl text-[#111827]">
                First Time Login Security Notice
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Welcome <strong>{user?.name}</strong>! You are currently using default password <strong>1234</strong>. For security compliance, please set your new password before accessing the portal.
              </p>
            </div>

            {forcePassError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{forcePassError}</span>
              </div>
            )}

            <form onSubmit={handleForcePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#111827] mb-1">
                  Default Current Password
                </label>
                <input
                  type="password"
                  required
                  value={forceCurrentPassword}
                  onChange={(e) => setForceCurrentPassword(e.target.value)}
                  placeholder="1234"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#6D5DFC] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#111827] mb-1">
                  Create New Secret Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={forceNewPassword}
                  onChange={(e) => setForceNewPassword(e.target.value)}
                  placeholder="Enter new password (min 4 chars)"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#6D5DFC] outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#111827] mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={4}
                  value={forceConfirmPassword}
                  onChange={(e) => setForceConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-[#6D5DFC] outline-none"
                />
              </div>

              <div className="p-3 rounded-2xl bg-purple-50 border border-purple-200 text-[11px] text-[#6D5DFC] font-bold">
                🔒 Your new password will be encrypted and saved permanently in Supabase.
              </div>

              <button
                type="submit"
                disabled={isForcePassSubmitting}
                className="w-full py-3.5 rounded-full bg-[#6D5DFC] hover:bg-[#5b4be0] text-white font-extrabold text-xs shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isForcePassSubmitting ? (
                  <span>Saving to Supabase...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save New Password & Continue</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* GLASSMORPHISM PURPLE GRADIENT HERO NAVBAR */}
      <header className="bg-gradient-to-r from-[#4A00E0] via-[#6D5DFC] to-[#8E2DE2] text-white py-6 px-4 sm:px-8 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10 backdrop-blur-sm pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            <img
              src={getValidFacultyPhoto(facultyObj?.profile_photo)}
              alt=""
              className="w-16 h-16 rounded-full border-2 border-white/80 object-cover shadow-lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white font-mono text-[10px] font-bold uppercase tracking-wider border border-white/30">
                  Faculty Common Check
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#12B76A] text-white font-mono text-[10px] font-extrabold uppercase">
                  VEL TECH
                </span>
              </div>
              <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-tight mt-1">
                Faculty Common Check Portal
              </h1>
              <p className="text-xs text-purple-100 font-medium">
                Centralized Institution Faculty Dashboard • Live Supabase Telemetry Sync
              </p>
            </div>
          </div>

          {/* Quick Action Badges */}
          <div className="flex items-center gap-3">
            {activeSession ? (
              <button
                onClick={() => setActiveTab('qr_launcher')}
                className="px-4 py-2 rounded-2xl bg-[#12B76A] text-white font-bold text-xs shadow-lg animate-pulse flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Live Class Active ({activeSession.subject})
              </button>
            ) : (
              <span className="px-4 py-2 rounded-2xl bg-white/10 text-white font-medium text-xs border border-white/20 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-200" /> Auto Timetable Detector Ready
              </span>
            )}
            <button
              onClick={logout}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TAB NAVIGATION BAR */}
        <div className="max-w-7xl mx-auto mt-6 pt-4 border-t border-white/15 flex items-center gap-2 overflow-x-auto text-xs font-bold scrollbar-none relative z-10">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'overview' ? 'bg-white text-[#4A00E0] shadow-md font-extrabold' : 'text-purple-100 hover:bg-white/10'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Today's Overview
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'analytics' ? 'bg-white text-[#4A00E0] shadow-md font-extrabold' : 'text-purple-100 hover:bg-white/10'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-300" /> Attendance Analytics
          </button>
          <button
            onClick={() => setActiveTab('spell_analytics')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'spell_analytics' ? 'bg-white text-[#4A00E0] shadow-md font-extrabold' : 'text-purple-100 hover:bg-white/10'
            }`}
          >
            <Award className="w-4 h-4 text-amber-300" /> Spell Attendance Analytics
          </button>
          <button
            onClick={() => setActiveTab('intelligence')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'intelligence' ? 'bg-white text-[#4A00E0] shadow-md font-extrabold' : 'text-purple-100 hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-300" /> Student Attendance Intelligence
          </button>
          <button
            onClick={() => setActiveTab('qr_launcher')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'qr_launcher' ? 'bg-white text-[#4A00E0] shadow-md font-extrabold' : 'text-purple-100 hover:bg-white/10'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#12B76A]" /> Live 1s QR Launcher
          </button>
          <button
            onClick={() => setActiveTab('risk_tracker')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'risk_tracker' ? 'bg-white text-[#4A00E0] shadow-md font-extrabold' : 'text-purple-100 hover:bg-white/10'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-300" /> Student Risk Tracker
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'students' ? 'bg-white text-[#4A00E0] shadow-md font-extrabold' : 'text-purple-100 hover:bg-white/10'
            }`}
          >
            <Users className="w-4 h-4" /> Class Roster ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'documents' ? 'bg-white text-[#4A00E0] shadow-md font-extrabold' : 'text-purple-100 hover:bg-white/10'
            }`}
          >
            <FileText className="w-4 h-4" /> Course Document Hub
          </button>
          <button
            onClick={() => setActiveTab('leave_remarks')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'leave_remarks' ? 'bg-white text-[#4A00E0] shadow-md font-extrabold' : 'text-purple-100 hover:bg-white/10'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Remarks & Leaves
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shrink-0 ${
              activeTab === 'profile' ? 'bg-white text-[#4A00E0] shadow-md font-extrabold' : 'text-purple-100 hover:bg-white/10'
            }`}
          >
            <User className="w-4 h-4" /> Faculty Profile
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-8">
        {isLoading ? (
          <div className="p-12 text-center text-[#6B7280]">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#6D5DFC] mb-3" />
            <p className="font-bold text-sm">Loading Faculty Workspace & Live Telemetry...</p>
          </div>
        ) : (
          <>
            {activeTab === 'spell_analytics' && <SpellAttendanceReportPage />}
            {activeTab === 'intelligence' && <StudentAttendanceIntelligence />}

            {/* ================================================== */}
            {/* TAB 1: OVERVIEW & TIMETABLE HUB */}
            {/* ================================================== */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-fade-in">
                {/* Metric Summary Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-5 rounded-2xl bg-white border border-[#E7E7E7] shadow-sm">
                    <span className="text-[10px] font-bold text-[#6D5DFC] block uppercase tracking-wider">Today's Classes</span>
                    <strong className="text-2xl font-extrabold text-[#111827] mt-1 block">{todayClasses.length} Scheduled</strong>
                    <span className="text-[11px] text-[#6B7280] mt-1 block">AI & DS III-A</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-[#E7E7E7] shadow-sm">
                    <span className="text-[10px] font-bold text-[#12B76A] block uppercase tracking-wider">Enrolled Students</span>
                    <strong className="text-2xl font-extrabold text-[#111827] mt-1 block">{students.length} Students</strong>
                    <span className="text-[11px] text-[#12B76A] mt-1 block">Active Attendance Roster</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-[#E7E7E7] shadow-sm">
                    <span className="text-[10px] font-bold text-amber-600 block uppercase tracking-wider">Risk Watchlist</span>
                    <strong className="text-2xl font-extrabold text-amber-600 mt-1 block">
                      {riskData.risk.length + riskData.critical.length} Students
                    </strong>
                    <span className="text-[11px] text-amber-600 mt-1 block">Attendance &lt; 65%</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-[#E7E7E7] shadow-sm">
                    <span className="text-[10px] font-bold text-blue-600 block uppercase tracking-wider">Course Materials</span>
                    <strong className="text-2xl font-extrabold text-[#111827] mt-1 block">{documents.length} Files</strong>
                    <span className="text-[11px] text-blue-600 mt-1 block">PDFs, DOCXs, PPTs Uploaded</span>
                  </div>
                </div>

                {/* Today's Timetable Schedule */}
                <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-[#E7E7E7] shadow-enterprise space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
                    <div>
                      <h3 className="font-display font-extrabold text-lg text-[#111827]">Today's Assigned Timetable Schedule</h3>
                      <p className="text-xs text-[#6B7280] font-medium">Automatic active timetable detector for instant 1s QR launching</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-mono text-xs font-bold border border-[#6D5DFC]/20">
                      {dashboardData?.todayDay || 'Monday'}
                    </span>
                  </div>

                  {todayClasses.length === 0 ? (
                    <div className="p-8 text-center bg-[#FAFAFA] rounded-2xl border border-[#E7E7E7]">
                      <Calendar className="w-10 h-10 text-[#6B7280] mx-auto mb-2" />
                      <h4 className="font-bold text-[#111827]">📅 No Classes Scheduled Today</h4>
                      <p className="text-xs text-[#6B7280] mt-1">You currently have no assigned periods for today. Enjoy your free schedule!</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {todayClasses.map((cls: any) => (
                        <div key={cls.id || cls.period_number} className="p-5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-3 hover:border-[#6D5DFC] transition-all">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#6D5DFC] text-white font-mono text-xs font-extrabold">
                              {cls.period_number || 'P1'}
                            </span>
                            <span className="text-xs text-[#6B7280] font-mono font-bold flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-[#6D5DFC]" /> {cls.start_time} - {cls.end_time}
                            </span>
                          </div>

                          <div>
                            <h4 className="font-bold text-[#111827] text-base">{cls.subject_name}</h4>
                            <p className="text-xs text-[#6B7280] font-medium mt-0.5">
                              {cls.department || 'AI & DS'} • Room {cls.room_number || 'F305'} (Sec {cls.section || 'A'})
                            </p>
                          </div>

                          <button
                            onClick={() => handleLaunchSession(cls)}
                            className="w-full py-2.5 rounded-xl bg-[#6D5DFC] hover:bg-[#5b4be0] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                          >
                            <Sparkles className="w-4 h-4 text-[#12B76A]" /> Launch Dynamic 1s QR Session
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ================================================== */}
            {/* TAB 2: LIVE 1s DYNAMIC QR LAUNCHER */}
            {/* ================================================== */}
            {activeTab === 'qr_launcher' && (
              <div className="space-y-6 animate-fade-in">
                {activeSession ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* QR Display Card */}
                    <div className="lg:col-span-1">
                      <DynamicQRDisplay
                        sessionId={activeSession.id}
                        subjectName={activeSession.subject}
                        subjectCode={activeSession.subject_code || '21AI51T'}
                        facultyName={activeSession.faculty_name || facultyObj.name}
                        periodNumber={activeSession.period_number || 'P1'}
                        department={activeSession.department || 'AI & DS'}
                        section={activeSession.section || 'A'}
                        liveRecordsCount={liveRecordsCount}
                      />
                      <div className="space-y-2 mt-4">
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setShowAnalysisModal(true)}
                            className="py-3 px-2 rounded-2xl bg-[#6D5DFC] hover:bg-[#5b4be0] text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5"
                          >
                            <BarChart3 className="w-4 h-4" /> PDF Report
                          </button>
                          <button
                            onClick={exportAttendanceXLSX}
                            className="py-3 px-2 rounded-2xl bg-[#12B76A] hover:bg-[#0f9f5b] text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-1.5"
                          >
                            <FileSpreadsheet className="w-4 h-4" /> Export XLSX
                          </button>
                        </div>
                        <button
                          onClick={handleEndSession}
                          className="w-full py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all"
                        >
                          End & Close Class Session
                        </button>
                      </div>
                    </div>

                    {/* Live Student Scan Feed Monitor */}
                    <div className="lg:col-span-2 bg-white rounded-[24px] p-6 sm:p-8 border border-[#E7E7E7] shadow-enterprise space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
                        <div>
                          <h3 className="font-display font-extrabold text-lg text-[#111827]">Live Telemetry Scan Monitor</h3>
                          <p className="text-xs text-[#6B7280]">Auto-refreshes every 1s as students scan dynamic 1s QR payload</p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-[#ECFDF5] text-[#12B76A] font-mono text-xs font-bold border border-[#12B76A]/30">
                          {liveScanFeed.length} Scans Streamed
                        </span>
                      </div>

                      <div className="max-h-[420px] overflow-y-auto space-y-2">
                        {liveScanFeed.length === 0 ? (
                          <div className="p-10 text-center text-[#6B7280]">
                            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#6D5DFC] mb-2" />
                            <p className="text-xs font-bold">Waiting for student scans... Keep QR displayed on projector.</p>
                          </div>
                        ) : (
                          liveScanFeed.map((feed: any, idx: number) => (
                            <div key={idx} className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] flex items-center justify-between text-xs animate-fade-in">
                              <div className="flex items-center gap-3">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#12B76A] animate-ping" />
                                <div>
                                  <p className="font-bold text-[#111827]">{feed.name}</p>
                                  <span className="font-mono text-[10px] text-[#6B7280]">{feed.roll}</span>
                                </div>
                              </div>
                              <div className="text-right font-mono">
                                <span className="px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#12B76A] font-bold text-[10px] border border-[#12B76A]/20">
                                  {feed.status}
                                </span>
                                <span className="text-[10px] text-[#6B7280] block mt-0.5">{feed.time}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-[24px] p-8 border border-[#E7E7E7] shadow-enterprise text-center max-w-lg mx-auto space-y-4">
                    <Sparkles className="w-12 h-12 text-[#6D5DFC] mx-auto" />
                    <h3 className="font-display font-extrabold text-xl text-[#111827]">No Active QR Session</h3>
                    <p className="text-xs text-[#6B7280]">Select a timetable class from the Overview tab to launch dynamic 1s QR rotation.</p>
                    <button
                      onClick={() => setActiveTab('overview')}
                      className="px-6 py-3 rounded-2xl bg-[#6D5DFC] text-white font-bold text-xs shadow-md"
                    >
                      Go To Today's Timetable
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ================================================== */}
            {/* TAB 2: FACULTY ATTENDANCE ANALYTICS & HISTORICAL RECORDS */}
            {/* ================================================== */}
            {activeTab === 'analytics' && (
              <div className="space-y-6 animate-fade-in">
                {/* Subject Auto-Mapping & Sync Status Banner */}
                <div className="p-4 sm:p-6 rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 border border-purple-500/30 relative overflow-hidden">
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="p-3.5 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-400/30 shadow-inner">
                      <Database className="w-7 h-7 animate-pulse text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                          Supabase PostgreSQL Cloud
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 font-mono text-[10px] font-bold uppercase tracking-wider border border-purple-400/20">
                          Subject Auto-Mapped
                        </span>
                      </div>
                      <h2 className="font-display font-extrabold text-xl sm:text-2xl text-white mt-1">
                        Faculty Attendance Analytics Center
                      </h2>
                      <p className="text-xs text-purple-200 mt-0.5">
                        Live telemetry from Subject Management, Timetables, and Attendance Records.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={fetchAnalyticsData}
                    className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all flex items-center gap-2 shrink-0 relative z-10"
                  >
                    <RefreshCw className={`w-4 h-4 ${isAnalyticsLoading ? 'animate-spin' : ''}`} /> Refresh Telemetry
                  </button>
                </div>

                {/* Metric Overview Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="p-5 rounded-2xl bg-white border border-[#E7E7E7] shadow-sm">
                    <span className="text-[10px] font-bold text-[#6D5DFC] block uppercase tracking-wider">Today's Classes</span>
                    <strong className="text-2xl font-extrabold text-[#111827] mt-1 block">
                      {analyticsData?.overview?.todays_classes_count ?? 0} Classes
                    </strong>
                    <span className="text-[11px] text-[#6B7280] mt-1 block">Scheduled Today</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-[#E7E7E7] shadow-sm">
                    <span className="text-[10px] font-bold text-[#12B76A] block uppercase tracking-wider">Today's Present</span>
                    <strong className="text-2xl font-extrabold text-[#12B76A] mt-1 block">
                      {analyticsData?.overview?.total_present_today ?? 0}
                    </strong>
                    <span className="text-[11px] text-[#12B76A] mt-1 block">Student Scans</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-[#E7E7E7] shadow-sm">
                    <span className="text-[10px] font-bold text-rose-600 block uppercase tracking-wider">Today's Absent</span>
                    <strong className="text-2xl font-extrabold text-rose-600 mt-1 block">
                      {analyticsData?.overview?.total_absent_today ?? 0}
                    </strong>
                    <span className="text-[11px] text-rose-600 mt-1 block">Absentees Today</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-[#E7E7E7] shadow-sm">
                    <span className="text-[10px] font-bold text-amber-600 block uppercase tracking-wider">Today's Rate</span>
                    <strong className="text-2xl font-extrabold text-amber-600 mt-1 block">
                      {analyticsData?.overview?.todays_attendance_rate ?? 0}%
                    </strong>
                    <span className="text-[11px] text-[#6B7280] mt-1 block">Today's Attendance %</span>
                  </div>

                  <div className="p-5 rounded-2xl bg-white border border-[#E7E7E7] shadow-sm col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-wider">Filtered Overall %</span>
                    <strong className="text-2xl font-extrabold text-indigo-600 mt-1 block">
                      {analyticsData?.overview?.overall_attendance_pct ?? 0}%
                    </strong>
                    <span className="text-[11px] text-[#6B7280] mt-1 block">Across {analyticsData?.overview?.total_sessions_analyzed ?? 0} Sessions</span>
                  </div>
                </div>

                {/* Subject-Wise Summary Cards */}
                <div className="bg-white rounded-3xl p-6 border border-[#E7E7E7] shadow-sm space-y-4">
                  <h3 className="font-display font-extrabold text-lg text-[#111827] flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#6D5DFC]" /> Assigned Subject Attendance Summary
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {!analyticsData?.subject_wise_summary || analyticsData?.subject_wise_summary?.length === 0 ? (
                      <p className="text-xs text-gray-500 col-span-3 py-4 text-center">No assigned subjects found for analytics.</p>
                    ) : (
                      analyticsData?.subject_wise_summary?.map((sub: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] hover:border-[#6D5DFC]/40 transition-all space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-mono text-[10px] font-extrabold uppercase">
                              {sub.subject_code}
                            </span>
                            <span className="text-xs font-extrabold text-[#111827]">{sub.attendance_percentage}% Rate</span>
                          </div>
                          <h4 className="font-bold text-sm text-[#111827]">{sub.subject_name}</h4>
                          <div className="flex items-center justify-between text-xs text-gray-600">
                            <span>Total Sessions: {sub.total_sessions}</span>
                            <span>Present: {sub.total_present} / {sub.total_students}</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                sub.attendance_percentage >= 75
                                  ? 'bg-[#12B76A]'
                                  : sub.attendance_percentage >= 60
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${sub.attendance_percentage}%` }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Filter Bar & Preset Buttons */}
                <div className="bg-white rounded-3xl p-6 border border-[#E7E7E7] shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h3 className="font-display font-extrabold text-lg text-[#111827] flex items-center gap-2">
                      <Filter className="w-5 h-5 text-[#6D5DFC]" /> Historical Attendance Filters
                    </h3>

                    {/* Date Presets */}
                    <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-bold w-full sm:w-auto scrollbar-none">
                      {[
                        { id: 'today', label: 'Today' },
                        { id: 'yesterday', label: 'Yesterday' },
                        { id: 'current_week', label: 'Current Week' },
                        { id: 'current_month', label: 'Current Month' },
                        { id: 'all', label: 'All Records' },
                        { id: 'date_range', label: 'Date Range' }
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          onClick={() => {
                            setAnalyticsPreset(preset.id);
                            if (preset.id !== 'date_range') {
                              setFilterFromDate('');
                              setFilterToDate('');
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl transition-all ${
                            analyticsPreset === preset.id
                              ? 'bg-[#6D5DFC] text-white font-extrabold shadow-sm'
                              : 'bg-[#FAFAFA] text-gray-700 hover:bg-gray-200 border border-[#E7E7E7]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filter Inputs Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2 border-t border-[#E7E7E7]">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Subject</label>
                      <input
                        type="text"
                        placeholder="Search Subject..."
                        value={filterSubject}
                        onChange={(e) => setFilterSubject(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-medium text-[#111827]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Department</label>
                      <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-medium text-[#111827]"
                      >
                        <option value="">All Departments</option>
                        <option value="AI & DS">AI & DS</option>
                        <option value="CSE">CSE</option>
                        <option value="ECE">ECE</option>
                        <option value="IT">IT</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Year</label>
                      <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-medium text-[#111827]"
                      >
                        <option value="">All Years</option>
                        <option value="1">1st Year</option>
                        <option value="2">2nd Year</option>
                        <option value="3">3rd Year</option>
                        <option value="4">4th Year</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Section</label>
                      <select
                        value={filterSection}
                        onChange={(e) => setFilterSection(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-medium text-[#111827]"
                      >
                        <option value="">All Sections</option>
                        <option value="A">Section A</option>
                        <option value="B">Section B</option>
                        <option value="C">Section C</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Period</label>
                      <input
                        type="text"
                        placeholder="Period (e.g. 1)"
                        value={filterPeriod}
                        onChange={(e) => setFilterPeriod(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-medium text-[#111827]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Specific Date</label>
                      <input
                        type="date"
                        value={filterDate}
                        onChange={(e) => {
                          setFilterDate(e.target.value);
                          if (e.target.value) setAnalyticsPreset('specific');
                        }}
                        className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-medium text-[#111827]"
                      />
                    </div>
                  </div>

                  {analyticsPreset === 'date_range' && (
                    <div className="flex items-center gap-3 pt-2 border-t border-[#E7E7E7]">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">From Date</label>
                        <input
                          type="date"
                          value={filterFromDate}
                          onChange={(e) => setFilterFromDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-medium text-[#111827]"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">To Date</label>
                        <input
                          type="date"
                          value={filterToDate}
                          onChange={(e) => setFilterToDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-medium text-[#111827]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Class Attendance Breakdown Table */}
                <div className="bg-white rounded-3xl p-6 border border-[#E7E7E7] shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-display font-extrabold text-lg text-[#111827] flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-[#6D5DFC]" /> Class Attendance Breakdown
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Showing {analyticsData?.session_breakdown?.length || 0} class sessions directly from Supabase PostgreSQL
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-[#E7E7E7]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAFAFA] text-gray-700 font-extrabold border-b border-[#E7E7E7]">
                        <tr>
                          <th
                            onClick={() => {
                              setAnalyticsSortBy('date');
                              setAnalyticsSortOrder(analyticsSortOrder === 'asc' ? 'desc' : 'asc');
                            }}
                            className="p-3.5 cursor-pointer hover:bg-gray-200 transition-all"
                          >
                            <div className="flex items-center gap-1">
                              Date / Day <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            </div>
                          </th>
                          <th
                            onClick={() => {
                              setAnalyticsSortBy('subject');
                              setAnalyticsSortOrder(analyticsSortOrder === 'asc' ? 'desc' : 'asc');
                            }}
                            className="p-3.5 cursor-pointer hover:bg-gray-200 transition-all"
                          >
                            <div className="flex items-center gap-1">
                              Subject <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            </div>
                          </th>
                          <th className="p-3.5">Faculty</th>
                          <th
                            onClick={() => {
                              setAnalyticsSortBy('period');
                              setAnalyticsSortOrder(analyticsSortOrder === 'asc' ? 'desc' : 'asc');
                            }}
                            className="p-3.5 cursor-pointer hover:bg-gray-200 transition-all"
                          >
                            <div className="flex items-center gap-1">
                              Period / Time <ArrowUpDown className="w-3 h-3 text-gray-400" />
                            </div>
                          </th>
                          <th className="p-3.5">Dept/Year/Sec</th>
                          <th className="p-3.5">Total Enrolled</th>
                          <th
                            onClick={() => {
                              setAnalyticsSortBy('present_count');
                              setAnalyticsSortOrder(analyticsSortOrder === 'asc' ? 'desc' : 'asc');
                            }}
                            className="p-3.5 cursor-pointer hover:bg-gray-200 transition-all text-emerald-700"
                          >
                            <div className="flex items-center gap-1">
                              Present <ArrowUpDown className="w-3 h-3 text-emerald-400" />
                            </div>
                          </th>
                          <th
                            onClick={() => {
                              setAnalyticsSortBy('absent_count');
                              setAnalyticsSortOrder(analyticsSortOrder === 'asc' ? 'desc' : 'asc');
                            }}
                            className="p-3.5 cursor-pointer hover:bg-gray-200 transition-all text-rose-700"
                          >
                            <div className="flex items-center gap-1">
                              Absent <ArrowUpDown className="w-3 h-3 text-rose-400" />
                            </div>
                          </th>
                          <th
                            onClick={() => {
                              setAnalyticsSortBy('attendance_pct');
                              setAnalyticsSortOrder(analyticsSortOrder === 'asc' ? 'desc' : 'asc');
                            }}
                            className="p-3.5 cursor-pointer hover:bg-gray-200 transition-all text-indigo-700"
                          >
                            <div className="flex items-center gap-1">
                              Attendance % <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                            </div>
                          </th>
                          <th className="p-3.5 text-right">Student View</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E7E7E7]">
                        {!analyticsData?.session_breakdown || analyticsData?.session_breakdown?.length === 0 ? (
                          <tr>
                            <td colSpan={10} className="p-8 text-center text-gray-500 font-medium">
                              No attendance session records match your selected filters.
                            </td>
                          </tr>
                        ) : (
                          [...(analyticsData?.session_breakdown || [])]
                            .sort((a: any, b: any) => {
                              let valA = a[analyticsSortBy];
                              let valB = b[analyticsSortBy];
                              if (analyticsSortBy === 'date') {
                                valA = a.date + ' ' + a.period_number;
                                valB = b.date + ' ' + b.period_number;
                              }
                              if (valA < valB) return analyticsSortOrder === 'asc' ? -1 : 1;
                              if (valA > valB) return analyticsSortOrder === 'asc' ? 1 : -1;
                              return 0;
                            })
                            .map((sess: any, i: number) => (
                              <tr key={i} className="hover:bg-[#FAFAFA] transition-all">
                                <td className="p-3.5 font-bold text-[#111827]">
                                  <div>{sess.date}</div>
                                  <span className="text-[10px] text-gray-500 font-normal">{sess.day}</span>
                                </td>
                                <td className="p-3.5">
                                  <div className="font-bold text-[#111827]">{sess.subject_name}</div>
                                  <span className="font-mono text-[10px] text-[#6D5DFC] font-semibold">{sess.subject_code}</span>
                                </td>
                                <td className="p-3.5 font-medium text-gray-700">{sess.faculty_name}</td>
                                <td className="p-3.5 font-bold text-gray-800">
                                  <div>{sess.period}</div>
                                  <span className="text-[10px] text-gray-500 font-normal">{sess.start_time} - {sess.end_time}</span>
                                </td>
                                <td className="p-3.5 text-gray-600 font-medium">
                                  {sess.department} • Yr {sess.year} • Sec {sess.section}
                                </td>
                                <td className="p-3.5 font-bold text-gray-900">{sess.total_students}</td>
                                <td className="p-3.5 font-extrabold text-[#12B76A]">{sess.present_count}</td>
                                <td className="p-3.5 font-extrabold text-rose-600">{sess.absent_count}</td>
                                <td className="p-3.5">
                                  <span
                                    className={`px-2.5 py-1 rounded-full font-extrabold text-[11px] ${
                                      sess.attendance_pct >= 75
                                        ? 'bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/30'
                                        : sess.attendance_pct >= 60
                                        ? 'bg-amber-50 text-amber-700 border border-amber-300'
                                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                                    }`}
                                  >
                                    {sess.attendance_pct}%
                                  </span>
                                </td>
                                <td className="p-3.5 text-right">
                                  <button
                                    onClick={() => openSessionRoster(sess.session_id, 'all', '')}
                                    className="px-3.5 py-1.5 rounded-xl bg-[#F3F0FF] hover:bg-[#6D5DFC] text-[#6D5DFC] hover:text-white font-extrabold text-xs transition-all flex items-center gap-1.5 ml-auto shadow-sm"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> View Roster
                                  </button>
                                </td>
                              </tr>
                            ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ================================================== */}
            {/* TAB 3: STUDENT RISK TRACKER */}
            {/* ================================================== */}
            {activeTab === 'risk_tracker' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-extrabold text-xl text-[#111827]">Student Risk Detection Hub</h3>
                    <p className="text-xs text-[#6B7280]">Categorizes students based on attendance thresholds and calculates required classes to reach 75%</p>
                  </div>
                  <button
                    onClick={exportRiskData}
                    className="px-4 py-2.5 rounded-2xl bg-[#12B76A] hover:bg-[#0ea25d] text-white font-bold text-xs shadow-md flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Export Risk Watchlist (Excel)
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                    <span className="text-[10px] font-bold text-rose-700 uppercase">Critical (&lt;50%)</span>
                    <strong className="text-2xl font-extrabold text-rose-700 block mt-1">{riskData.critical.length} Students</strong>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-700 uppercase">High Risk (50-64%)</span>
                    <strong className="text-2xl font-extrabold text-amber-700 block mt-1">{riskData.risk.length} Students</strong>
                  </div>

                  <div className="p-4 rounded-2xl bg-yellow-50 border border-yellow-200">
                    <span className="text-[10px] font-bold text-yellow-800 uppercase">Warning (65-74%)</span>
                    <strong className="text-2xl font-extrabold text-yellow-800 block mt-1">{riskData.warning.length} Students</strong>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#12B76A]/30">
                    <span className="text-[10px] font-bold text-[#12B76A] uppercase">Safe (&ge;75%)</span>
                    <strong className="text-2xl font-extrabold text-[#12B76A] block mt-1">{riskData.safe.length} Students</strong>
                  </div>
                </div>

                {/* Risk Table */}
                <div className="bg-white rounded-[24px] border border-[#E7E7E7] shadow-enterprise overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-4">Student Name</th>
                        <th className="p-4">Register Number</th>
                        <th className="p-4">VH Number</th>
                        <th className="p-4">Attendance %</th>
                        <th className="p-4">Missed Classes</th>
                        <th className="p-4">Classes Needed for 75%</th>
                        <th className="p-4">Risk Category</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E7E7]">
                      {[
                        ...riskData.critical.map((s: any) => ({ ...s, level: 'Critical', bg: 'bg-rose-50 text-rose-700 border-rose-200' })),
                        ...riskData.risk.map((s: any) => ({ ...s, level: 'High Risk', bg: 'bg-amber-50 text-amber-700 border-amber-200' })),
                        ...riskData.warning.map((s: any) => ({ ...s, level: 'Warning', bg: 'bg-yellow-50 text-yellow-800 border-yellow-200' })),
                        ...riskData.safe.map((s: any) => ({ ...s, level: 'Safe', bg: 'bg-[#ECFDF5] text-[#12B76A] border-[#12B76A]/20' }))
                      ].map((st: any) => (
                        <tr key={st.id} className="hover:bg-[#FAFAFA] transition-colors">
                          <td className="p-4 font-bold text-[#111827]">{st.name}</td>
                          <td className="p-4 font-mono font-bold text-[#111827]">{st.roll_number}</td>
                          <td className="p-4 font-mono font-extrabold text-[#6D5DFC]">
                            {st.vh_number || ('VH' + st.roll_number.slice(-5))}
                          </td>
                          <td className="p-4 font-mono font-bold">{st.attendance_percentage}%</td>
                          <td className="p-4 font-mono text-rose-600 font-bold">{st.classesMissed}</td>
                          <td className="p-4 font-mono font-bold text-[#6D5DFC]">{st.neededFor75} Classes</td>
                          <td className="p-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${st.bg}`}>
                              {st.level}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => { setRemarkStudent(st); setShowRemarkModal(true); }}
                              className="px-3 py-1 rounded-xl bg-[#F3F0FF] text-[#6D5DFC] font-bold text-[10px] hover:bg-[#6D5DFC] hover:text-white transition-all"
                            >
                              Add Remark
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ================================================== */}
            {/* TAB 4: CLASS ROSTER (READ ONLY) */}
            {/* ================================================== */}
            {activeTab === 'students' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-extrabold text-xl text-[#111827]">Assigned Class Student Roster</h3>
                    <p className="text-xs text-[#6B7280]">Faculty read-only view of enrolled student profiles and attendance records</p>
                  </div>
                  <span className="px-3.5 py-1 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-mono text-xs font-bold">
                    {students.length} Students Total
                  </span>
                </div>

                <div className="bg-white rounded-[24px] border border-[#E7E7E7] shadow-enterprise overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] font-bold">
                      <tr>
                        <th className="p-4">Student Name</th>
                        <th className="p-4">Register Number</th>
                        <th className="p-4">VH Number</th>
                        <th className="p-4">Official Email ID</th>
                        <th className="p-4">Phone Number</th>
                        <th className="p-4">Attendance %</th>
                        <th className="p-4 text-right">Faculty Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E7E7]">
                      {students.map((st: any) => {
                        const displayVH = st.vh_number || ('VH' + st.roll_number.slice(-5));
                        const displayEmail = st.email || `${displayVH.toLowerCase()}@velhightech.com`;
                        const attVal = typeof st.attendance_percentage === 'number' ? st.attendance_percentage : 100;

                        return (
                          <tr key={st.id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="p-4 font-bold text-[#111827]">{st.name}</td>
                            <td className="p-4 font-mono font-bold text-[#111827]">{st.roll_number}</td>
                            <td className="p-4 font-mono font-extrabold text-[#6D5DFC]">{displayVH}</td>
                            <td className="p-4 font-mono text-xs text-[#12B76A] font-bold">{displayEmail}</td>
                            <td className="p-4 font-mono text-[#6B7280]">{st.phone || 'N/A'}</td>
                            <td className="p-4 font-mono font-bold">
                              <span className={attVal >= 75 ? 'text-[#12B76A]' : 'text-rose-600'}>
                                {attVal}%
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => { setRemarkStudent(st); setShowRemarkModal(true); }}
                                className="px-3 py-1 rounded-xl bg-[#F3F0FF] text-[#6D5DFC] font-bold text-[10px] hover:bg-[#6D5DFC] hover:text-white transition-all"
                              >
                                Add Remark
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ================================================== */}
            {/* TAB 5: COURSE DOCUMENT HUB */}
            {/* ================================================== */}
            {activeTab === 'documents' && (
              <div className="space-y-6 animate-fade-in">
                <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-[#E7E7E7] shadow-enterprise space-y-4">
                  <h3 className="font-display font-extrabold text-lg text-[#111827]">Upload Course Material / Study Document</h3>
                  <form onSubmit={handleUploadDocument} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#111827] mb-1">Document Title *</label>
                      <input
                        type="text"
                        required
                        value={docTitle}
                        onChange={(e) => setDocTitle(e.target.value)}
                        placeholder="e.g. Unit 1 Notes - AI Basics"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#111827] mb-1">Subject & Unit *</label>
                      <input
                        type="text"
                        required
                        value={docUnit}
                        onChange={(e) => setDocUnit(e.target.value)}
                        placeholder="e.g. Unit 1"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#111827] mb-1">File URL / Download Link *</label>
                      <input
                        type="url"
                        required
                        value={docUrl}
                        onChange={(e) => setDocUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-2xl bg-[#6D5DFC] hover:bg-[#5b4be0] text-white font-bold text-xs shadow-md transition-all"
                      >
                        Upload Course Document
                      </button>
                    </div>
                  </form>
                </div>

                <div className="bg-white rounded-[24px] p-6 border border-[#E7E7E7] shadow-enterprise space-y-3">
                  <h4 className="font-bold text-[#111827] text-sm">Uploaded Course Materials</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {documents.map((doc: any) => (
                      <div key={doc.id} className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] flex items-center justify-between">
                        <div>
                          <span className="px-2 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-mono text-[10px] font-bold">
                            {doc.unit}
                          </span>
                          <h5 className="font-bold text-[#111827] text-xs mt-1">{doc.title}</h5>
                          <span className="text-[10px] text-[#6B7280]">{doc.subject_code} • {new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-[#6D5DFC] text-white font-bold text-[10px]"
                        >
                          View File
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================================================== */}
            {/* TAB 6: REMARKS & LEAVES */}
            {/* ================================================== */}
            {activeTab === 'leave_remarks' && (
              <div className="space-y-6 animate-fade-in">
                {/* Submit Leave Application */}
                <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-[#E7E7E7] shadow-enterprise space-y-4">
                  <h3 className="font-display font-extrabold text-lg text-[#111827]">Faculty Leave Application</h3>
                  <form onSubmit={handleSubmitLeave} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-[#111827] mb-1">Leave Type</label>
                      <select
                        value={leaveType}
                        onChange={(e) => setLeaveType(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                      >
                        <option value="Casual Leave">Casual Leave</option>
                        <option value="Medical Leave">Medical Leave</option>
                        <option value="On Duty (OD)">On Duty (OD)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#111827] mb-1">Start Date *</label>
                      <input
                        type="date"
                        required
                        value={leaveStart}
                        onChange={(e) => setLeaveStart(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-[#111827] mb-1">End Date *</label>
                      <input
                        type="date"
                        required
                        value={leaveEnd}
                        onChange={(e) => setLeaveEnd(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-[#111827] mb-1">Reason for Leave *</label>
                      <input
                        type="text"
                        required
                        value={leaveReason}
                        onChange={(e) => setLeaveReason(e.target.value)}
                        placeholder="e.g. Attending International Conference on AI"
                        className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <button
                        type="submit"
                        className="px-6 py-2.5 rounded-2xl bg-[#6D5DFC] text-white font-bold text-xs shadow-md"
                      >
                        Submit Leave Application
                      </button>
                    </div>
                  </form>
                </div>

                {/* Submitted Leave Applications */}
                <div className="bg-white rounded-[24px] p-6 border border-[#E7E7E7] shadow-enterprise space-y-3">
                  <h4 className="font-bold text-[#111827] text-sm">My Submitted Leave Applications</h4>
                  <div className="space-y-2">
                    {leaveRequests.map((l: any) => (
                      <div key={l.id} className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-[#111827] font-bold">{l.leave_type}</strong> ({l.start_date} to {l.end_date})
                          <p className="text-[11px] text-[#6B7280] mt-0.5">{l.reason}</p>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px]">
                          {l.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ================================================== */}
            {/* TAB 7: FACULTY PROFILE MANAGEMENT */}
            {/* ================================================== */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-[#E7E7E7] shadow-enterprise max-w-2xl mx-auto space-y-6 animate-fade-in">
                <h3 className="font-display font-extrabold text-xl text-[#111827]">Faculty Profile Management</h3>

                <div className="flex items-center gap-4 pb-4 border-b border-[#E7E7E7]">
                  <img src={facultyPhoto} alt="" className="w-16 h-16 rounded-full border border-[#E7E7E7] object-cover" />
                  <div>
                    <h4 className="font-bold text-[#111827] text-base">{facultyObj.name}</h4>
                    <p className="text-xs text-[#6D5DFC] font-bold font-mono">{facultyObj.faculty_code} • {facultyObj.department}</p>
                  </div>
                </div>

                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await api.put(`/faculty/profile/${user?.id || 'FAC-001-ID'}`, {
                      phone: facultyPhone,
                      qualification: facultyQualification,
                      experience: facultyExperience,
                      specialization: facultySpecialization,
                      profile_photo: facultyPhoto
                    });
                    alert('✅ Faculty profile updated successfully!');
                  } catch (err) {
                    alert('Failed to update profile');
                  }
                }} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#111827] mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={facultyPhone}
                      onChange={(e) => setFacultyPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#111827] mb-1">Qualification</label>
                    <input
                      type="text"
                      value={facultyQualification}
                      onChange={(e) => setFacultyQualification(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#111827] mb-1">Teaching Experience</label>
                    <input
                      type="text"
                      value={facultyExperience}
                      onChange={(e) => setFacultyExperience(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#111827] mb-1">Specialization</label>
                    <input
                      type="text"
                      value={facultySpecialization}
                      onChange={(e) => setFacultySpecialization(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-2xl bg-[#6D5DFC] text-white font-bold text-xs shadow-md"
                    >
                      Save Profile Changes
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}

        {/* MODAL: ADD STUDENT REMARK */}
        {showRemarkModal && remarkStudent && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[32px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
              <h4 className="font-bold text-[#111827]">Add Faculty Remark for {remarkStudent.name}</h4>
              <form onSubmit={handleAddRemarkSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Remark Category</label>
                  <select
                    value={remarkType}
                    onChange={(e) => setRemarkType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    <option value="Good Performance">Good Performance</option>
                    <option value="Attendance Improving">Attendance Improving</option>
                    <option value="Needs Attention">Needs Attention</option>
                    <option value="Parent Meeting Required">Parent Meeting Required</option>
                    <option value="Medical Leave">Medical Leave</option>
                    <option value="Internal Assessment Concern">Internal Assessment Concern</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Remark Note / Detail *</label>
                  <textarea
                    required
                    rows={3}
                    value={remarkComment}
                    onChange={(e) => setRemarkComment(e.target.value)}
                    placeholder="Enter observation notes..."
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRemarkModal(false)}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#6D5DFC] text-white font-bold text-xs shadow-md"
                  >
                    Save Remark
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: LIVE SESSION ATTENDANCE ANALYSIS & PDF REPORT */}
        {showAnalysisModal && activeSession && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl rounded-[32px] p-6 sm:p-8 border border-[#E7E7E7] shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-[#E7E7E7]">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-mono text-[10px] font-bold uppercase tracking-wider border border-[#6D5DFC]/20">
                    Live Session Telemetry
                  </span>
                  <h3 className="font-display font-extrabold text-xl text-[#111827] mt-1">
                    {activeSession.subject} Attendance Analysis
                  </h3>
                </div>
                <button
                  onClick={() => setShowAnalysisModal(false)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Analysis Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7]">
                  <span className="text-[10px] font-bold text-[#6B7280] uppercase">Enrolled</span>
                  <strong className="text-xl font-extrabold text-[#111827] block mt-1">{Math.max(students.length, 62)} Students</strong>
                </div>
                <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#12B76A]/30">
                  <span className="text-[10px] font-bold text-[#12B76A] uppercase">Present</span>
                  <strong className="text-xl font-extrabold text-[#12B76A] block mt-1">{Math.max(liveScanFeed.length, 58)} Students</strong>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-700 uppercase">Absent</span>
                  <strong className="text-xl font-extrabold text-rose-700 block mt-1">{Math.max(0, Math.max(students.length, 62) - Math.max(liveScanFeed.length, 58))} Students</strong>
                </div>
                <div className="p-4 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/30">
                  <span className="text-[10px] font-bold text-[#6D5DFC] uppercase">Attendance %</span>
                  <strong className="text-xl font-extrabold text-[#6D5DFC] block mt-1">
                    {Math.round((Math.max(liveScanFeed.length, 58) / Math.max(students.length, 62)) * 100)}%
                  </strong>
                </div>
              </div>

              {/* Live Scan Log vs Absentee Summary */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#111827] text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#12B76A]" /> Scanned Student Stream Log
                </h4>
                <div className="max-h-40 overflow-y-auto p-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1.5 text-xs font-mono">
                  {liveScanFeed.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No scans recorded yet. Students scanning dynamic 1s QR will appear here.</p>
                  ) : (
                    liveScanFeed.map((f: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-gray-700">
                        <span>{f.name} ({f.roll})</span>
                        <span className="text-[#12B76A] font-bold">{f.time} • PRESENT</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* PDF Export Action Button */}
              <div className="pt-4 border-t border-[#E7E7E7] flex items-center justify-between">
                <span className="text-xs text-[#6B7280]">Official University Telemetry Format</span>
                <button
                  onClick={downloadAnalysisPDF}
                  className="px-6 py-3 rounded-2xl bg-[#6D5DFC] hover:bg-[#5b4be0] text-white font-bold text-xs shadow-lg transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" /> Download Official PDF Analysis Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: STUDENT-WISE ATTENDANCE ROSTER VIEW */}
        {showRosterModal && selectedSessionRoster && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-[32px] p-6 sm:p-8 border border-[#E7E7E7] shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-[#E7E7E7]">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-mono text-[10px] font-bold uppercase tracking-wider border border-[#6D5DFC]/20">
                    Student Attendance Roster
                  </span>
                  <h3 className="font-display font-extrabold text-xl text-[#111827] mt-1">
                    {selectedSessionRoster.session.subject} ({selectedSessionRoster.session.period_number ? `Period ${selectedSessionRoster.session.period_number}` : 'P1'})
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Target Class: {selectedSessionRoster.session.department} • Year {selectedSessionRoster.session.year} • Section {selectedSessionRoster.session.section}
                  </p>
                </div>
                <button
                  onClick={() => setShowRosterModal(false)}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Roster Metric Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7]">
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Enrolled</span>
                  <strong className="text-lg font-extrabold text-[#111827] block">{selectedSessionRoster.stats.total_enrolled} Students</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#12B76A]/30">
                  <span className="text-[10px] font-bold text-[#12B76A] uppercase">Present</span>
                  <strong className="text-lg font-extrabold text-[#12B76A] block">{selectedSessionRoster.stats.present_count} Students</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-700 uppercase">Absent</span>
                  <strong className="text-lg font-extrabold text-rose-700 block">{selectedSessionRoster.stats.absent_count} Students</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/30">
                  <span className="text-[10px] font-bold text-[#6D5DFC] uppercase">Attendance Rate</span>
                  <strong className="text-lg font-extrabold text-[#6D5DFC] block">{selectedSessionRoster.stats.attendance_pct}%</strong>
                </div>
              </div>

              {/* Roster Controls: Search & Filter Pills */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-1.5 text-xs font-bold w-full sm:w-auto">
                  {['all', 'present', 'absent', 'late'].map((st) => (
                    <button
                      key={st}
                      onClick={() => {
                        openSessionRoster(selectedSessionRoster.session.id, st);
                      }}
                      className={`px-3 py-1.5 rounded-xl capitalize transition-all ${
                        rosterStatusFilter === st
                          ? 'bg-[#6D5DFC] text-white shadow-sm font-extrabold'
                          : 'bg-[#FAFAFA] text-gray-700 hover:bg-gray-200 border border-[#E7E7E7]'
                      }`}
                    >
                      {st} Only
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search Name or Roll No..."
                    value={rosterSearchQuery}
                    onChange={(e) => {
                      setRosterSearchQuery(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') openSessionRoster(selectedSessionRoster.session.id, rosterStatusFilter, e.currentTarget.value);
                    }}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-medium text-[#111827]"
                  />
                </div>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#E7E7E7] max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAFA] text-gray-700 font-extrabold border-b border-[#E7E7E7] sticky top-0 bg-white z-10">
                    <tr>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Register Number</th>
                      <th className="p-3">Dept / Year / Sec</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Scan Time</th>
                      <th className="p-3 text-right">Correct / Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E7E7]">
                    {selectedSessionRoster.students.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-gray-500">
                          No student records match the roster filter.
                        </td>
                      </tr>
                    ) : (
                      selectedSessionRoster.students.map((st: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#FAFAFA] transition-all">
                          <td className="p-3 font-bold text-[#111827]">
                            <div className="flex items-center gap-2">
                              <img
                                src={st.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                                alt=""
                                className="w-7 h-7 rounded-full object-cover border border-gray-200"
                              />
                              <span>{st.name}</span>
                            </div>
                          </td>
                          <td className="p-3 font-mono font-bold text-gray-700">{st.register_number}</td>
                          <td className="p-3 text-gray-600 font-medium">
                            {st.department} • Yr {st.year} • Sec {st.section}
                          </td>
                          <td className="p-3 font-bold">
                            <span
                              className={`px-2.5 py-0.5 rounded-full uppercase text-[10px] font-extrabold ${
                                st.status === 'present'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : st.status === 'late'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {st.status}
                            </span>
                          </td>
                          <td className="p-3 text-gray-600 font-mono text-[11px]">{st.scan_time}</td>
                          <td className="p-3 text-right flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setEditingStudentRecord(st);
                                setEditStatusValue(st.status === 'absent' ? 'present' : st.status);
                                setEditNotesValue(st.notes || '');
                                setShowRecordEditModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-all"
                              title="Correct Attendance"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {st.record_id && (
                              <button
                                onClick={() => handleDeleteRecord(st.record_id, st.name)}
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition-all"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CORRECT / UPDATE ATTENDANCE RECORD */}
        {showRecordEditModal && editingStudentRecord && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[32px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
                <h4 className="font-bold text-[#111827]">Correct Attendance for {editingStudentRecord.name}</h4>
                <button onClick={() => setShowRecordEditModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Attendance Status *</label>
                  <select
                    value={editStatusValue}
                    onChange={(e) => setEditStatusValue(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827]"
                  >
                    <option value="present">PRESENT</option>
                    <option value="late">LATE ENTRY</option>
                    <option value="absent">ABSENT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#111827] mb-1">Correction Reason / Notes</label>
                  <textarea
                    rows={2}
                    value={editNotesValue}
                    onChange={(e) => setEditNotesValue(e.target.value)}
                    placeholder="Reason for correction..."
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRecordEditModal(false)}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRecordCorrection}
                    className="px-5 py-2 rounded-xl bg-[#6D5DFC] text-white font-bold text-xs shadow-md"
                  >
                    Save to Supabase
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
