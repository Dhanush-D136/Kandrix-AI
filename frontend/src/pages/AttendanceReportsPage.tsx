import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { User, SubjectItem } from '../types';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import {
  BookOpen,
  UserCheck,
  Calendar,
  Clock,
  Download,
  FileSpreadsheet,
  Users,
  Search,
  X,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  Award,
  CheckCircle2,
  XCircle,
  Filter,
  Plus,
  Edit,
  Trash2,
  ListChecks,
  QrCode,
  BarChart3
} from 'lucide-react';
import { SpellAttendanceReportPage } from './SpellAttendanceReportPage';
import { StudentAttendanceIntelligence } from '../components/StudentAttendanceIntelligence';

interface SubjectStat {
  id: string;
  name: string;
  code: string;
  type?: string;
  faculty_name: string;
  classesHeld: number;
  avgPercentage: number;
  presentCount: number;
  absentCount: number;
  lastClassDate: string;
  studentsBelow75: number;
  students?: any[];
}

interface AttendanceRecordItem {
  id: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  student_email: string;
  student_department: string;
  student_year: number;
  student_section: string;
  profile_photo: string;
  subject: string;
  attendance_code: string;
  attendance_time: string;
  status: string;
  notes?: string;
}

interface AttendanceReportsPageProps {
  onNavigate?: (tab: string, extraData?: any) => void;
}

export const AttendanceReportsPage: React.FC<AttendanceReportsPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isFaculty = user?.role === 'student' ? false : !isAdmin;

  const [selectedSubject, setSelectedSubject] = useState<SubjectStat | null>(null);
  const [activeTab, setActiveTab] = useState<'subjects' | 'records' | 'defaulters' | 'monthly' | 'spell' | 'intelligence'>('subjects');


  // Live Data States
  const [subjectsData, setSubjectsData] = useState<SubjectStat[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecordItem[]>([]);
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [defaultersList, setDefaultersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [deptFilter, setDeptFilter] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [subjectCodeFilter, setSubjectCodeFilter] = useState<string>('');
  const [facultyFilter, setFacultyFilter] = useState<string>('');
  const [periodFilter, setPeriodFilter] = useState<string>('');
  const [semesterFilter, setSemesterFilter] = useState<string>('');
  const [sectionFilter, setSectionFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [fromTime, setFromTime] = useState<string>('');
  const [toTime, setToTime] = useState<string>('');

  // View & Subject Student Filters
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [subjectStudentFilter, setSubjectStudentFilter] = useState<'all' | 'above75' | 'below75' | 'defaulter' | 'presentToday' | 'absentToday'>('all');

  // Modals for Attendance & Subject CRUD
  const [showMarkModal, setShowMarkModal] = useState<boolean>(false);
  const [showEditRecordModal, setShowEditRecordModal] = useState<boolean>(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState<boolean>(false);

  // New Subject Form
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    type: 'Theory',
    department: 'AI & DS',
    year: '3',
    semester: '5',
    section: 'A',
    faculty_name: user?.name || '',
    credits: '3',
    status: 'Active',
    description: ''
  });

  // New Attendance Record Form State
  const [newAttendance, setNewAttendance] = useState({
    student_id: '',
    subject: '',
    status: 'present',
    attendance_time: new Date().toISOString().slice(0, 16),
    notes: 'Marked by faculty'
  });

  // Edit Attendance Record Form State
  const [editingRecord, setEditingRecord] = useState<{
    id: string;
    student_name: string;
    roll_number: string;
    subject: string;
    status: string;
    notes: string;
    attendance_time: string;
  } | null>(null);

  // Fetch Reports and Roster Data with Advanced Search Params
  const fetchReportsData = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (isFaculty && user?.name) {
        params.append('faculty_name', user.name);
      }
      if (subjectFilter) params.append('subject_name', subjectFilter);
      if (subjectCodeFilter) params.append('subject_code', subjectCodeFilter);
      if (facultyFilter) params.append('faculty_name', facultyFilter);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (fromTime) params.append('from_time', fromTime);
      if (toTime) params.append('to_time', toTime);
      if (periodFilter) params.append('period_number', periodFilter);
      if (semesterFilter) params.append('semester', semesterFilter);
      if (sectionFilter) params.append('section', sectionFilter);

      const [resReports, resSub, studentRes, sessRes] = await Promise.all([
        api.get(`/analytics/reports?${params.toString()}`),
        api.get(`/subjects?${params.toString()}`),
        api.get('/students'),
        api.get('/sessions')
      ]);

      if (resReports.data.subjectStats) {
        setSubjectsData(resReports.data.subjectStats);
      } else if (resSub.data.subjects) {
        setSubjectsData(resSub.data.subjects);
      }

      if (resReports.data.defaulters) setDefaultersList(resReports.data.defaulters);
      if (studentRes.data.students) setStudents(studentRes.data.students);
      if (sessRes.data.sessions) setSessionsList(sessRes.data.sessions);
    } catch (err) {
      console.error('Failed to load reports data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Attendance Records
  const fetchAttendanceRecords = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter) params.append('status', statusFilter);
      if (deptFilter) params.append('department', deptFilter);
      if (subjectFilter) params.append('subject', subjectFilter);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);

      const res = await api.get(`/attendance/records?${params.toString()}`);
      setAttendanceRecords(res.data.records || []);
    } catch (err) {
      console.error('Failed to load attendance records:', err);
    }
  };

  useEffect(() => {
    fetchReportsData();
  }, []);

  useEffect(() => {
    if (activeTab === 'records') {
      fetchAttendanceRecords();
    }
  }, [activeTab, searchQuery, statusFilter, deptFilter, subjectFilter, periodFilter, fromDate, toDate]);

  // Real-time Socket Listener
  useEffect(() => {
    const socket = getSocket();
    const handleUpdate = () => {
      fetchReportsData();
      if (activeTab === 'records') fetchAttendanceRecords();
    };

    socket.on('attendanceMarked', handleUpdate);
    socket.on('attendance_marked', handleUpdate);
    socket.on('attendance_updated', handleUpdate);
    socket.on('attendance_deleted', handleUpdate);

    socket.on('timetable_created', handleUpdate);
    socket.on('timetable_updated', handleUpdate);
    socket.on('timetable_deleted', handleUpdate);
    socket.on('timetable_changed', handleUpdate);

    return () => {
      socket.off('attendanceMarked', handleUpdate);
      socket.off('attendance_marked', handleUpdate);
      socket.off('attendance_updated', handleUpdate);
      socket.off('attendance_deleted', handleUpdate);

      socket.off('timetable_created', handleUpdate);
      socket.off('timetable_updated', handleUpdate);
      socket.off('timetable_deleted', handleUpdate);
      socket.off('timetable_changed', handleUpdate);
    };
  }, [activeTab]);

  // Submit Add Subject Form
  const handleAddSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/subjects', subjectForm);
      alert('✅ Subject created and synchronized across all modules!');
      setShowAddSubjectModal(false);
      fetchReportsData();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to create subject'}`);
    }
  };

  // Create Manual Attendance Record
  const handleMarkAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttendance.student_id) {
      alert('Please select a student');
      return;
    }
    try {
      await api.post('/attendance/admin-mark', newAttendance);
      alert('✅ Attendance record inserted successfully!');
      setShowMarkModal(false);
      fetchAttendanceRecords();
      fetchReportsData();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to insert attendance record'}`);
    }
  };

  // Open Edit Attendance Record Modal
  const openEditRecordModal = (rec: AttendanceRecordItem) => {
    setEditingRecord({
      id: rec.id,
      student_name: rec.student_name,
      roll_number: rec.roll_number,
      subject: rec.subject || 'General Session',
      status: rec.status,
      notes: rec.notes || '',
      attendance_time: rec.attendance_time ? new Date(rec.attendance_time).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)
    });
    setShowEditRecordModal(true);
  };

  // Submit Update Attendance Record
  const handleUpdateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    try {
      await api.put(`/attendance/records/${editingRecord.id}`, {
        status: editingRecord.status,
        notes: editingRecord.notes,
        attendance_time: new Date(editingRecord.attendance_time).toISOString()
      });
      alert('✅ Attendance record updated successfully!');
      setShowEditRecordModal(false);
      setEditingRecord(null);
      fetchAttendanceRecords();
      fetchReportsData();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to update record'}`);
    }
  };

  // Delete Attendance Record
  const handleDeleteRecord = async (id: string, studentName: string) => {
    if (!confirm(`Are you sure you want to delete attendance entry for ${studentName}?`)) return;
    try {
      await api.delete(`/attendance/records/${id}`);
      alert('✅ Attendance record removed');
      fetchAttendanceRecords();
      fetchReportsData();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to delete record'}`);
    }
  };

  // Export Attendance Log to Excel & CSV
  const handleExportExcel = (format: 'xlsx' | 'csv' = 'xlsx') => {
    const exportData = attendanceRecords.map((r) => {
      const vh = (r as any).vh_number || (r.roll_number ? 'VH' + r.roll_number.slice(-5) : 'VH13936');
      const officialEmail = `${vh.toLowerCase()}@velhightech.com`;
      return {
        'Student Name': r.student_name,
        'Register Number': r.roll_number,
        'VH Number': vh,
        'Official Email ID': officialEmail,
        Department: r.student_department,
        Class: `Yr ${r.student_year} Sec ${r.student_section}`,
        Subject: r.subject || 'General',
        Status: r.status.toUpperCase(),
        'Attendance Time': new Date(r.attendance_time).toLocaleString(),
        Notes: r.notes || ''
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Records');
    const filename = `EliteMinds_Attendance_Export_${new Date().toISOString().split('T')[0]}.${format}`;
    XLSX.writeFile(wb, filename, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
  };

  // Export Defaulters to Excel / CSV
  const handleExportDefaulters = (format: 'xlsx' | 'csv' = 'xlsx') => {
    const exportData = defaultersList.map((d) => {
      const vh = (d as any).vh_number || (d.roll_number ? 'VH' + d.roll_number.slice(-5) : 'VH13936');
      const officialEmail = `${vh.toLowerCase()}@velhightech.com`;
      const attVal = typeof d.overallPercentage === 'number' ? d.overallPercentage : (d.attendance_percentage || 0);
      return {
        'Student Name': d.name,
        'Register Number': d.roll_number,
        'VH Number': vh,
        'Official Email ID': officialEmail,
        'Attendance %': `${attVal}%`,
        'Classes Attended': d.classesAttended || 0,
        'Classes Missed': d.classesMissed || 0,
        'Classes Needed for 75%': attVal < 75 ? Math.max(0, Math.ceil(3 * ((d.classesAttended || 0) + (d.classesMissed || 0)) - 4 * (d.classesAttended || 0))) : 0,
        Status: attVal < 75 ? 'DEFAULTER (< 75%)' : 'REGULAR'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Defaulters List');
    const filename = `EliteMinds_Defaulters_${new Date().toISOString().split('T')[0]}.${format}`;
    XLSX.writeFile(wb, filename, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
  };

  // Export Subject Analytics to Excel / CSV
  const handleExportSubjectExcel = (format: 'xlsx' | 'csv' = 'xlsx') => {
    const exportData = displayedSubjects.map((s) => ({
      'Subject Code': s.code,
      'Subject Name': s.name,
      'Faculty Name': s.faculty_name,
      'Total Classes Conducted': s.classesHeld,
      'Present Count': s.presentCount,
      'Absent Count': s.absentCount,
      'Attendance %': s.avgPercentage !== null && s.avgPercentage !== undefined ? `${s.avgPercentage}%` : '--',
      'Defaulters (<75%)': s.studentsBelow75 || 0,
      'Last Session Date': s.lastClassDate
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Subject Analytics');
    const filename = `EliteMinds_Subject_Analytics_${new Date().toISOString().split('T')[0]}.${format}`;
    XLSX.writeFile(wb, filename, { bookType: format === 'csv' ? 'csv' : 'xlsx' });
  };

  // Export Subject Analytics / Student Details to PDF
  const handleExportPDF = (subject?: SubjectStat) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const dataToPrint = subject ? [subject] : displayedSubjects;
    const title = subject ? `Subject Attendance Details: ${subject.name} (${subject.code})` : 'Advanced Subject-Wise Attendance Analytics Report';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #111827; }
          h1 { color: #6D5DFC; margin-bottom: 4px; font-size: 22px; font-weight: 800; }
          h3 { color: #6B7280; margin-top: 0; font-size: 13px; font-weight: 600; }
          .meta { margin: 16px 0 24px 0; font-size: 12px; color: #4B5563; background: #FAFAFA; border: 1px solid #E7E7E7; border-radius: 12px; padding: 12px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th, td { border: 1px solid #E7E7E7; padding: 10px; text-align: left; }
          th { background-color: #F3F0FF; color: #6D5DFC; font-weight: 700; text-transform: uppercase; font-size: 10px; }
          tr:nth-child(even) { background-color: #FAFAFA; }
          .badge { padding: 3px 8px; border-radius: 12px; font-size: 10px; font-weight: 800; text-transform: uppercase; }
          .badge-green { background: #ECFDF5; color: #12B76A; }
          .badge-red { background: #FEF2F2; color: #EF4444; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #9CA3AF; border-top: 1px solid #E7E7E7; padding-top: 16px; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <h3>KANDRIX AI Attendance System • AI Enhanced Smart QR Attendance Platform</h3>
        <div class="meta">
          <strong>Date Generated:</strong> ${new Date().toLocaleString()}<br/>
          <strong>Date Range Filter:</strong> ${fromDate || 'All'} to ${toDate || 'Present'} &nbsp;&nbsp;|&nbsp;&nbsp; 
          <strong>Time Filter:</strong> ${fromTime || '00:00'} - ${toTime || '23:59'}
        </div>
        ${
          subject && subject.students
            ? `
          <h2>Student Roster & Attendance Breakdown (${subject.students.length} Enrolled)</h2>
          <table>
            <thead>
              <tr>
                <th>Register / Roll Number</th>
                <th>Student Name</th>
                <th>Present Count</th>
                <th>Absent Count</th>
                <th>Attendance %</th>
                <th>Last Attended Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${subject.students
                .map(
                  (st: any) => `
                <tr>
                  <td><strong>${st.roll_number}</strong></td>
                  <td>${st.name}</td>
                  <td>${st.presentCount}</td>
                  <td>${st.absentCount}</td>
                  <td><strong>${st.percentage}%</strong></td>
                  <td>${st.lastAttendedDate}</td>
                  <td><span class="badge ${st.percentage >= 75 ? 'badge-green' : 'badge-red'}">${st.percentage >= 75 ? 'Above 75%' : 'Defaulter'}</span></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
            : `
          <table>
            <thead>
              <tr>
                <th>Subject Code</th>
                <th>Subject Name</th>
                <th>Faculty Name</th>
                <th>Classes Conducted</th>
                <th>Present Count</th>
                <th>Absent Count</th>
                <th>Avg Attendance %</th>
                <th>Defaulter Count (<75%)</th>
                <th>Last Attendance Session</th>
              </tr>
            </thead>
            <tbody>
              ${dataToPrint
                .map(
                  (s) => `
                <tr>
                  <td><strong>${s.code}</strong></td>
                  <td>${s.name}</td>
                  <td>${s.faculty_name}</td>
                  <td>${s.classesHeld}</td>
                  <td>${s.presentCount}</td>
                  <td>${s.absentCount}</td>
                  <td><strong>${s.avgPercentage}%</strong></td>
                  <td>${s.studentsBelow75 || 0}</td>
                  <td>${s.lastClassDate}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `
        }
        <div class="footer">KANDRIX AI Attendance System • Confidential Academic Report</div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Filtered Subject Analytics Cards
  const displayedSubjects = subjectsData.filter((s) => {
    if (isFaculty && user?.name && s.faculty_name.toLowerCase() !== user.name.toLowerCase()) {
      return false;
    }
    if (subjectFilter && !s.name.toLowerCase().includes(subjectFilter.toLowerCase()) && !s.code.toLowerCase().includes(subjectFilter.toLowerCase())) return false;
    if (subjectCodeFilter && !s.code.toLowerCase().includes(subjectCodeFilter.toLowerCase())) return false;
    if (facultyFilter && !s.faculty_name.toLowerCase().includes(facultyFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl text-[#111827]">
              Attendance & Reports Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-bold text-xs border border-[#6D5DFC]/20">
              AI&DS III-A
            </span>
          </div>
          <p className="text-xs text-[#6B7280] font-medium mt-1">
            Subject-Wise Analytics, Timetable Sync, Attendance Log CRUD, and Defaulters Tracking
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setShowAddSubjectModal(true)}
              className="px-4 py-2 rounded-full bg-[#6D5DFC] text-white text-xs font-bold shadow-floating hover:bg-[#5b4be0] transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Add Subject
            </button>
          )}

          {activeTab === 'records' && (
            <button
              onClick={() => setShowMarkModal(true)}
              className="px-4 py-2 rounded-full bg-[#12B76A] text-white text-xs font-bold shadow-floating hover:bg-emerald-600 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Insert Attendance
            </button>
          )}

          <button
            onClick={() => handleExportExcel('xlsx')}
            className="px-4 py-2 rounded-full bg-[#ECFDF5] text-[#12B76A] text-xs font-bold border border-[#12B76A]/20 hover:bg-[#12B76A]/10 transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
          </button>
        </div>
      </div>

      {/* LEVEL 0: MAIN TABS & VIEWS */}
      {!selectedSubject && (
        <div className="space-y-6">
          {/* Navigation Bar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-[#E7E7E7]">
            {[
              { id: 'subjects', label: `Subject Analytics (${displayedSubjects.length})`, icon: BookOpen },
              { id: 'intelligence', label: 'Period Attendance Intelligence', icon: Sparkles },
              { id: 'spell', label: 'Spell Attendance (Date-Wise)', icon: BarChart3 },
              { id: 'records', label: `Attendance Log & CRUD (${attendanceRecords.length})`, icon: ListChecks },
              { id: 'defaulters', label: `Defaulters List (${defaultersList.length})`, icon: AlertTriangle },
              { id: 'monthly', label: 'Semester Trends', icon: Calendar }
            ].map((t) => {
              const Icon = t.icon;
              const isActive = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                    isActive
                      ? 'bg-[#6D5DFC] text-white shadow-floating'
                      : 'bg-white text-[#6B7280] border border-[#E7E7E7] hover:bg-[#FAFAFA]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB: PERIOD ATTENDANCE INTELLIGENCE */}
          {activeTab === 'intelligence' && <StudentAttendanceIntelligence />}

          {/* TAB: SPELL ATTENDANCE REPORT */}
          {activeTab === 'spell' && <SpellAttendanceReportPage />}


          {/* TAB 1: ADVANCED SUBJECT ANALYTICS GRID & TABLE VIEW */}
          {activeTab === 'subjects' && (
            <div className="space-y-5">
              {/* Advanced Subject Analytics Search Filter Bar */}
              <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#E7E7E7]">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-[#6D5DFC]" />
                    <h3 className="font-display font-extrabold text-sm text-[#111827]">
                      Advanced Subject-Wise Analytics Search & Filters
                    </h3>
                  </div>
                  
                  {/* View Switcher & Exporters */}
                  <div className="flex items-center gap-2">
                    <div className="bg-[#FAFAFA] p-1 rounded-2xl border border-[#E7E7E7] flex items-center gap-1">
                      <button
                        onClick={() => setViewMode('card')}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          viewMode === 'card' ? 'bg-[#6D5DFC] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
                        }`}
                      >
                        Card View
                      </button>
                      <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          viewMode === 'table' ? 'bg-[#6D5DFC] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
                        }`}
                      >
                        Table View
                      </button>
                    </div>

                    <button
                      onClick={() => handleExportSubjectExcel('xlsx')}
                      className="px-3.5 py-1.5 rounded-full bg-[#ECFDF5] text-[#12B76A] text-xs font-bold border border-[#12B76A]/20 hover:bg-[#12B76A]/10 flex items-center gap-1"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
                    </button>
                    <button
                      onClick={() => handleExportPDF()}
                      className="px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200 hover:bg-rose-100 flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Export PDF
                    </button>
                  </div>
                </div>

                {/* Filter Inputs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  {/* Subject Name / Keyword */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#6B7280] mb-1">Subject Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Machine Learning"
                      value={subjectFilter}
                      onChange={(e) => setSubjectFilter(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] font-medium"
                    />
                  </div>

                  {/* Subject Code */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#6B7280] mb-1">Subject Code</label>
                    <input
                      type="text"
                      placeholder="e.g. CS301"
                      value={subjectCodeFilter}
                      onChange={(e) => setSubjectCodeFilter(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] font-mono uppercase font-bold"
                    />
                  </div>

                  {/* Faculty Name */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#6B7280] mb-1">Faculty Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Rajesh Kumar"
                      value={facultyFilter}
                      onChange={(e) => setFacultyFilter(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:border-[#6D5DFC] font-medium"
                    />
                  </div>

                  {/* Period Number */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#6B7280] mb-1">Period Number</label>
                    <select
                      value={periodFilter}
                      onChange={(e) => setPeriodFilter(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                    >
                      <option value="">All Periods</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                        <option key={p} value={p}>Period {p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Date Range: From Date */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#6B7280] mb-1">From Date</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                    />
                  </div>

                  {/* Date Range: To Date */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#6B7280] mb-1">To Date</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                    />
                  </div>

                  {/* Time Range: From Time */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#6B7280] mb-1">From Time</label>
                    <input
                      type="time"
                      value={fromTime}
                      onChange={(e) => setFromTime(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                    />
                  </div>

                  {/* Time Range: To Time */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-[#6B7280] mb-1">To Time</label>
                    <input
                      type="time"
                      value={toTime}
                      onChange={(e) => setToTime(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E7E7]">
                  <button
                    onClick={() => {
                      setSubjectFilter('');
                      setSubjectCodeFilter('');
                      setFacultyFilter('');
                      setPeriodFilter('');
                      setSemesterFilter('');
                      setSectionFilter('');
                      setFromDate('');
                      setToDate('');
                      setFromTime('');
                      setToTime('');
                      fetchReportsData();
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-[#FAFAFA] text-[#6B7280] hover:text-[#111827] border border-[#E7E7E7] text-xs font-bold"
                  >
                    Reset Filters
                  </button>
                  <button
                    onClick={fetchReportsData}
                    className="px-4 py-1.5 rounded-full bg-[#6D5DFC] text-white text-xs font-bold shadow-floating hover:bg-[#5b4be0] flex items-center gap-1.5"
                  >
                    <Search className="w-3.5 h-3.5" /> Apply Search
                  </button>
                </div>
              </div>

              {displayedSubjects.length === 0 ? (
                <div className="bg-white p-12 rounded-[24px] border border-[#E7E7E7] shadow-enterprise text-center space-y-3">
                  <BookOpen className="w-10 h-10 text-[#6D5DFC] mx-auto opacity-70" />
                  <h4 className="font-display font-extrabold text-base text-[#111827]">No subject analytics match your search filter.</h4>
                  <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                    Try clearing date/time filters or updating keyword queries.
                  </p>
                </div>
              ) : viewMode === 'card' ? (
                /* CARD VIEW MODE */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {displayedSubjects.map((sub) => (
                    <div
                      key={sub.id}
                      className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4 flex flex-col justify-between hover:border-[#6D5DFC]/40 transition-all group"
                    >
                      <div>
                        <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20">
                              {sub.code}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              {sub.type || 'Theory'}
                            </span>
                          </div>
                          <span className="text-[11px] text-[#6B7280] font-medium">{sub.classesHeld} Sessions Held</span>
                        </div>

                        <h3 className="font-display font-extrabold text-lg text-[#111827] mt-3 group-hover:text-[#6D5DFC] transition-colors">
                          {sub.name}
                        </h3>
                        <p className="text-xs text-[#6B7280] font-semibold mt-1 flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-[#4F7CFF]" />
                          <span>Faculty: <strong className="text-[#4F7CFF]">{sub.faculty_name}</strong></span>
                        </p>

                        <div className="mt-4 p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] grid grid-cols-3 gap-2 text-center text-xs">
                          <div>
                            <span className="text-[9px] text-[#6B7280] font-bold block uppercase">AVG ATTENDANCE</span>
                            <strong className="font-mono text-[#6D5DFC] font-extrabold text-sm">{sub.avgPercentage}%</strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-[#12B76A] font-bold block uppercase">PRESENT</span>
                            <strong className="font-mono text-[#12B76A] font-extrabold text-sm">{sub.presentCount}</strong>
                          </div>
                          <div>
                            <span className="text-[9px] text-rose-500 font-bold block uppercase font-bold">ABSENT</span>
                            <strong className="font-mono text-rose-500 font-extrabold text-sm">{sub.absentCount}</strong>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-[11px] text-[#6B7280]">
                          <span>Defaulters (&lt;75%): <strong className="text-rose-600 font-bold">{sub.studentsBelow75 || 0}</strong></span>
                          <span className="font-mono text-[10px] text-[#9CA3AF]">{sub.lastClassDate}</span>
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 grid grid-cols-2 gap-2 text-xs">
                        <button
                          onClick={() => setSelectedSubject(sub)}
                          className="px-3 py-2 rounded-xl bg-[#F3F0FF] text-[#6D5DFC] font-bold hover:bg-[#6D5DFC] hover:text-white transition-all flex items-center justify-center gap-1.5"
                        >
                          <ListChecks className="w-3.5 h-3.5" />
                          <span>View Attendance</span>
                        </button>

                        <button
                          onClick={() => onNavigate && onNavigate('sessions', { subject: sub.name, code: sub.code, faculty: sub.faculty_name, period: '1' })}
                          className="px-3 py-2 rounded-xl bg-[#ECFDF5] text-[#12B76A] font-bold border border-[#12B76A]/20 hover:bg-[#12B76A] hover:text-white transition-all flex items-center justify-center gap-1.5"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Generate QR</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* TABLE VIEW MODE */
                <div className="bg-white rounded-[24px] border border-[#E7E7E7] shadow-enterprise overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] tracking-wider font-bold">
                        <tr>
                          <th className="p-4">Subject Code</th>
                          <th className="p-4">Subject Name</th>
                          <th className="p-4">Faculty Name</th>
                          <th className="p-4 text-center">Classes Conducted</th>
                          <th className="p-4 text-center">Present</th>
                          <th className="p-4 text-center">Absent</th>
                          <th className="p-4 text-center">Avg Attendance %</th>
                          <th className="p-4 text-center">Defaulters (&lt;75%)</th>
                          <th className="p-4">Last Session</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E7E7E7]">
                        {displayedSubjects.map((sub) => (
                          <tr key={sub.id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="p-4 font-mono font-bold text-[#6D5DFC]">{sub.code}</td>
                            <td className="p-4 font-bold text-[#111827]">{sub.name}</td>
                            <td className="p-4 font-medium text-[#4B5563]">{sub.faculty_name}</td>
                            <td className="p-4 text-center font-mono font-bold">{sub.classesHeld}</td>
                            <td className="p-4 text-center font-mono text-[#12B76A] font-bold">{sub.presentCount}</td>
                            <td className="p-4 text-center font-mono text-rose-500 font-bold">{sub.absentCount}</td>
                            <td className="p-4 text-center">
                              <span className={`px-2.5 py-0.5 rounded-full font-mono font-extrabold text-[11px] border ${
                                sub.avgPercentage >= 75
                                  ? 'bg-[#ECFDF5] text-[#12B76A] border-[#12B76A]/20'
                                  : 'bg-rose-50 text-rose-600 border-rose-200'
                              }`}>
                                {sub.avgPercentage}%
                              </span>
                            </td>
                            <td className="p-4 text-center font-mono text-rose-600 font-bold">
                              {sub.studentsBelow75 || 0}
                            </td>
                            <td className="p-4 text-[#6B7280] text-[11px]">{sub.lastClassDate}</td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => setSelectedSubject(sub)}
                                  className="px-3 py-1.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-bold text-[11px] hover:bg-[#6D5DFC] hover:text-white transition-all flex items-center gap-1"
                                >
                                  <ListChecks className="w-3.5 h-3.5" />
                                  <span>View Attendance</span>
                                </button>
                                <button
                                  onClick={() => onNavigate && onNavigate('sessions', { subject: sub.name, code: sub.code, faculty: sub.faculty_name, period: '1' })}
                                  className="px-3 py-1.5 rounded-full bg-[#ECFDF5] text-[#12B76A] font-bold text-[11px] border border-[#12B76A]/20 hover:bg-[#12B76A] hover:text-white transition-all flex items-center gap-1"
                                >
                                  <QrCode className="w-3.5 h-3.5" />
                                  <span>Generate QR</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ATTENDANCE RECORDS FULL CRUD LOG */}
          {activeTab === 'records' && (
            <div className="space-y-4">
              {/* Filter Controls Bar */}
              <div className="bg-white p-4 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex flex-col md:flex-row items-center gap-3">
                <div className="relative w-full md:w-72">
                  <input
                    type="text"
                    placeholder="Search student, roll no, subject..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] placeholder-[#9CA3AF] pl-9 focus:outline-none focus:border-[#6D5DFC] font-medium"
                  />
                  <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto text-xs">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                  >
                    <option value="">All Statuses</option>
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="excused">Excused</option>
                  </select>

                  <select
                    value={deptFilter}
                    onChange={(e) => setDeptFilter(e.target.value)}
                    className="px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                  >
                    <option value="">All Departments</option>
                    <option value="AI & DS">AI & DS</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mechanical">Mechanical</option>
                  </select>

                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827]"
                  />
                  <span className="text-[#6B7280]">to</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827]"
                  />
                </div>
              </div>

              {/* Attendance Table */}
              <div className="bg-white rounded-[24px] border border-[#E7E7E7] shadow-enterprise overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] tracking-wider font-bold">
                      <tr>
                        <th className="p-4">Student</th>
                        <th className="p-4">Roll Number</th>
                        <th className="p-4">Subject</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Timestamp</th>
                        <th className="p-4">Notes / Code</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E7E7]">
                      {attendanceRecords.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="p-10 text-center text-[#6B7280]">
                            No attendance log records matching current filter criteria.
                          </td>
                        </tr>
                      ) : (
                        attendanceRecords.map((rec) => (
                          <tr key={rec.id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="p-4 flex items-center gap-3">
                              <img
                                src={rec.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                alt=""
                                className="w-8 h-8 rounded-full border border-[#E7E7E7] object-cover"
                              />
                              <div>
                                <p className="font-bold text-[#111827]">{rec.student_name}</p>
                                <p className="text-[10px] text-[#6B7280]">{rec.student_department || 'Student'}</p>
                              </div>
                            </td>
                            <td className="p-4 font-mono text-[#6D5DFC] font-bold">{rec.roll_number}</td>
                            <td className="p-4 font-semibold text-[#111827]">{rec.subject || 'General Session'}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                rec.status === 'present'
                                  ? 'bg-[#ECFDF5] text-[#12B76A] border-[#12B76A]/20'
                                  : rec.status === 'absent'
                                  ? 'bg-rose-50 text-rose-600 border-rose-200'
                                  : rec.status === 'late'
                                  ? 'bg-amber-50 text-amber-600 border-amber-200'
                                  : 'bg-blue-50 text-blue-600 border-blue-200'
                              }`}>
                                {rec.status}
                              </span>
                            </td>
                            <td className="p-4 font-mono text-[#6B7280] text-[11px]">
                              {new Date(rec.attendance_time).toLocaleString()}
                            </td>
                            <td className="p-4 text-[#6B7280] text-[11px]">
                              {rec.notes || rec.attendance_code || 'Recorded'}
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => openEditRecordModal(rec)}
                                  className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-600 hover:bg-blue-100 transition-colors flex items-center gap-1"
                                  title="Edit status or timestamp"
                                >
                                  <Edit className="w-3 h-3" /> Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(rec.id, rec.student_name)}
                                  className="p-1.5 rounded-full text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
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

          {/* TAB 3: DEFAULTERS LIST */}
          {activeTab === 'defaulters' && (
            <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
                <div>
                  <h3 className="font-display font-extrabold text-lg text-[#111827]">Academic Defaulters List (&lt; 75%)</h3>
                  <p className="text-xs text-[#6B7280] font-medium mt-0.5">Students requiring attendance counseling and parent notification</p>
                </div>
                <button
                  onClick={() => handleExportDefaulters('xlsx')}
                  className="px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200 flex items-center gap-1 hover:bg-rose-100"
                >
                  <Download className="w-3.5 h-3.5" /> Export Defaulters
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E7E7E7] text-[#6B7280] font-bold uppercase tracking-wider">
                      <th className="pb-3 px-3">Register Number</th>
                      <th className="pb-3 px-3">Student Name</th>
                      <th className="pb-3 px-3 text-center">Overall Attendance %</th>
                      <th className="pb-3 px-3 text-center">Classes Attended / Missed</th>
                      <th className="pb-3 px-3 text-center">Status Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E7E7]">
                    {defaultersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-[#12B76A] font-bold">
                          🎉 Excellent! No student accounts are currently below the 75% attendance threshold.
                        </td>
                      </tr>
                    ) : (
                      defaultersList.map((d) => (
                        <tr key={d.id || d.roll_number} className="hover:bg-[#FAFAFA] transition-colors">
                          <td className="py-3.5 px-3 font-mono font-bold text-[#6D5DFC]">{d.roll_number}</td>
                          <td className="py-3.5 px-3 font-bold text-[#111827]">{d.name}</td>
                          <td className="py-3.5 px-3 text-center font-mono font-extrabold text-rose-600 text-sm">{d.overallPercentage}%</td>
                          <td className="py-3.5 px-3 text-center font-mono text-[#6B7280]">{d.classesAttended || 0} Attended / {d.classesMissed || 0} Missed</td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="px-2.5 py-0.5 rounded-full font-bold text-[10px] border bg-rose-50 text-rose-600 border-rose-200">
                              Critical (&lt; 75%)
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: MONTHLY TRENDS */}
          {activeTab === 'monthly' && (
            <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
              <h3 className="font-display font-extrabold text-lg text-[#111827]">Semester Monthly Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { month: 'Current Semester', pct: 92, classes: attendanceRecords.length },
                  { month: 'Month 1', pct: 94, classes: 24 },
                  { month: 'Month 2', pct: 91, classes: 26 },
                  { month: 'Month 3', pct: 93, classes: 25 }
                ].map((m) => (
                  <div key={m.month} className="p-5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[#111827]">{m.month}</span>
                      <span className="font-mono font-extrabold text-[#6D5DFC]">{m.pct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-[#E7E7E7] overflow-hidden">
                      <div className="h-full bg-[#6D5DFC] rounded-full" style={{ width: `${m.pct}%` }} />
                    </div>
                    <span className="text-[10px] text-[#6B7280] font-medium block pt-1">{m.classes} Lectures Recorded</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LEVEL 1: DRILL-DOWN SUBJECT ATTENDANCE DASHBOARD */}
      {selectedSubject && (
        <div className="space-y-6">
          <button
            onClick={() => setSelectedSubject(null)}
            className="px-4 py-2 rounded-full bg-white text-[#111827] text-xs font-bold border border-[#E7E7E7] shadow-sm hover:bg-[#FAFAFA] transition-all flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to All Subject Cards</span>
          </button>

          <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E7E7E7]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20">
                    {selectedSubject.code}
                  </span>
                  <h2 className="font-display font-extrabold text-2xl text-[#111827]">
                    {selectedSubject.name} Attendance Dashboard
                  </h2>
                </div>
                <p className="text-xs text-[#6B7280] font-medium mt-1">
                  Faculty: <strong className="text-[#4F7CFF]">{selectedSubject.faculty_name}</strong> • AI&DS III-A
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate && onNavigate('sessions', { subject: selectedSubject.name, faculty: selectedSubject.faculty_name })}
                  className="px-4 py-2 rounded-full bg-[#ECFDF5] text-[#12B76A] text-xs font-bold border border-[#12B76A]/20 hover:bg-[#12B76A] hover:text-white transition-all flex items-center gap-1.5"
                >
                  <QrCode className="w-3.5 h-3.5" /> Launch QR Session
                </button>

                <button
                  onClick={() => handleExportExcel('xlsx')}
                  className="px-4 py-2 rounded-full bg-[#6D5DFC] text-white text-xs font-bold shadow-floating hover:bg-[#5b4be0] flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Export Matrix
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase">Total Classes Conducted</span>
                <p className="font-display font-extrabold text-xl text-[#111827]">{selectedSubject.classesHeld} Lectures</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
                <span className="text-[10px] font-bold text-[#6D5DFC] uppercase">Average Attendance</span>
                <p className="font-display font-extrabold text-xl text-[#6D5DFC]">{selectedSubject.avgPercentage}%</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
                <span className="text-[10px] font-bold text-[#12B76A] uppercase">Average Present</span>
                <p className="font-display font-extrabold text-xl text-[#12B76A]">{selectedSubject.presentCount} Students</p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
                <span className="text-[10px] font-bold text-amber-600 uppercase">Average Absent</span>
                <p className="font-display font-extrabold text-xl text-amber-600">{selectedSubject.absentCount} Students</p>
              </div>
            </div>

            {/* Student Roster Breakdown for Selected Subject */}
            <div className="pt-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E7E7E7]">
                <div>
                  <h3 className="font-display font-extrabold text-base text-[#111827]">
                    Subject Student Details & Attendance Breakdown
                  </h3>
                  <p className="text-xs text-[#6B7280]">
                    Showing all students mapped to {selectedSubject.name} ({selectedSubject.code})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportPDF(selectedSubject)}
                    className="px-3.5 py-1.5 rounded-full bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200 hover:bg-rose-100 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Export PDF
                  </button>
                </div>
              </div>

              {/* Subject Student Detail Filters */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'All Students' },
                  { id: 'above75', label: 'Above 75%' },
                  { id: 'below75', label: 'Below 75%' },
                  { id: 'defaulter', label: 'Defaulters' },
                  { id: 'presentToday', label: 'Present Today' },
                  { id: 'absentToday', label: 'Absent Today' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSubjectStudentFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                      subjectStudentFilter === f.id
                        ? 'bg-[#6D5DFC] text-white shadow-sm'
                        : 'bg-[#FAFAFA] text-[#6B7280] border border-[#E7E7E7] hover:bg-[#F3F0FF]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Student Roster Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#E7E7E7]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[#6B7280] font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Register Number</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3 text-center">Present Count</th>
                      <th className="p-3 text-center">Absent Count</th>
                      <th className="p-3 text-center">Attendance %</th>
                      <th className="p-3">Last Attended Date</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E7E7]">
                    {((selectedSubject.students || []).filter((st: any) => {
                      if (subjectStudentFilter === 'above75') return st.percentage >= 75;
                      if (subjectStudentFilter === 'below75' || subjectStudentFilter === 'defaulter') return st.percentage < 75;
                      if (subjectStudentFilter === 'presentToday') return st.isPresentToday;
                      if (subjectStudentFilter === 'absentToday') return st.isAbsentToday;
                      return true;
                    })).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-[#6B7280]">
                          No student records match the selected filter pill.
                        </td>
                      </tr>
                    ) : (
                      (selectedSubject.students || []).filter((st: any) => {
                        if (subjectStudentFilter === 'above75') return st.percentage >= 75;
                        if (subjectStudentFilter === 'below75' || subjectStudentFilter === 'defaulter') return st.percentage < 75;
                        if (subjectStudentFilter === 'presentToday') return st.isPresentToday;
                        if (subjectStudentFilter === 'absentToday') return st.isAbsentToday;
                        return true;
                      }).map((st: any) => (
                        <tr key={st.id || st.roll_number} className="hover:bg-[#FAFAFA] transition-colors">
                          <td className="p-3 font-mono font-bold text-[#6D5DFC]">{st.roll_number}</td>
                          <td className="p-3 font-bold text-[#111827]">{st.name}</td>
                          <td className="p-3 text-center font-mono text-[#12B76A] font-bold">{st.presentCount}</td>
                          <td className="p-3 text-center font-mono text-rose-500 font-bold">{st.absentCount}</td>
                          <td className="p-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full font-mono font-extrabold text-[11px] border ${
                              st.percentage >= 75
                                ? 'bg-[#ECFDF5] text-[#12B76A] border-[#12B76A]/20'
                                : 'bg-rose-50 text-rose-600 border-rose-200'
                            }`}>
                              {st.percentage}%
                            </span>
                          </td>
                          <td className="p-3 font-mono text-[#6B7280] text-[11px]">{st.lastAttendedDate}</td>
                          <td className="p-3 text-right">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              st.percentage >= 75
                                ? 'bg-[#ECFDF5] text-[#12B76A] border-[#12B76A]/20'
                                : 'bg-rose-50 text-rose-600 border-rose-200'
                            }`}>
                              {st.percentage >= 75 ? 'Above 75%' : 'Defaulter'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sessions History for Selected Subject */}
            <div className="pt-4 space-y-3">
              <h3 className="font-display font-bold text-base text-[#111827]">Lectures & Attendance Sessions History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[#6B7280] font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Session Date & Time</th>
                      <th className="p-3">Period</th>
                      <th className="p-3">Attendance Code</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E7E7]">
                    {sessionsList
                      .filter((s) => s.subject.toLowerCase() === selectedSubject.name.toLowerCase() || s.subject.toLowerCase() === selectedSubject.code.toLowerCase())
                      .map((s) => (
                        <tr key={s.id} className="hover:bg-[#FAFAFA]">
                          <td className="p-3 font-semibold text-[#111827]">{new Date(s.start_time).toLocaleString()}</td>
                          <td className="p-3 font-bold text-[#6D5DFC]">Period {s.period_number || 1}</td>
                          <td className="p-3 font-mono font-bold text-[#4F7CFF]">{s.attendance_code}</td>
                          <td className="p-3">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20">
                              {s.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => onNavigate && onNavigate('records', { subject: selectedSubject.name })}
                              className="px-2.5 py-1 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-bold text-[10px]"
                            >
                              View Logs
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD NEW SUBJECT */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[24px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-display font-bold text-lg text-[#111827]">+ Add New Curriculum Subject</h3>
              <button onClick={() => setShowAddSubjectModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubjectSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Subject Name *</label>
                  <input
                    type="text"
                    required
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    placeholder="e.g. Operating Systems"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Subject Code *</label>
                  <input
                    type="text"
                    required
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    placeholder="e.g. CS301 / AL3501"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-mono uppercase font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Subject Type</label>
                  <select
                    value={subjectForm.type}
                    onChange={(e) => setSubjectForm({ ...subjectForm, type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                  >
                    <option value="Theory">Theory</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Project">Project</option>
                    <option value="Seminar">Seminar</option>
                    <option value="Library/Sports">Library/Sports</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Credits</label>
                  <input
                    type="number"
                    value={subjectForm.credits}
                    onChange={(e) => setSubjectForm({ ...subjectForm, credits: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Department</label>
                  <select
                    value={subjectForm.department}
                    onChange={(e) => setSubjectForm({ ...subjectForm, department: e.target.value })}
                    className="w-full px-2.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium text-[11px]"
                  >
                    <option value="AI & DS">AI & DS</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mechanical">Mechanical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Semester</label>
                  <select
                    value={subjectForm.semester}
                    onChange={(e) => setSubjectForm({ ...subjectForm, semester: e.target.value })}
                    className="w-full px-2.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium text-[11px]"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                      <option key={s} value={s}>Sem {s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Section</label>
                  <select
                    value={subjectForm.section}
                    onChange={(e) => setSubjectForm({ ...subjectForm, section: e.target.value })}
                    className="w-full px-2.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium text-[11px]"
                  >
                    <option value="A">Sec A</option>
                    <option value="B">Sec B</option>
                    <option value="C">Sec C</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Assigned Faculty Name</label>
                <input
                  type="text"
                  value={subjectForm.faculty_name}
                  onChange={(e) => setSubjectForm({ ...subjectForm, faculty_name: e.target.value })}
                  placeholder="e.g. Dr Rajesh Kumar"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] transition-all mt-2"
              >
                Save Subject & Synchronize All Modules
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INSERT NEW ATTENDANCE RECORD */}
      {showMarkModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[24px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-display font-bold text-lg text-[#111827]">Insert Attendance Entry</h3>
              <button onClick={() => setShowMarkModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMarkAttendance} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Select Student</label>
                <select
                  required
                  value={newAttendance.student_id}
                  onChange={(e) => setNewAttendance({ ...newAttendance, student_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827]"
                >
                  <option value="">Select a student...</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.roll_number}) - {st.department}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Subject</label>
                <select
                  value={newAttendance.subject}
                  onChange={(e) => setNewAttendance({ ...newAttendance, subject: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827]"
                >
                  {subjectsData.map((s) => (
                    <option key={s.id} value={s.name}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Attendance Status</label>
                  <select
                    value={newAttendance.status}
                    onChange={(e) => setNewAttendance({ ...newAttendance, status: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827]"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                    <option value="excused">Excused</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={newAttendance.attendance_time}
                    onChange={(e) => setNewAttendance({ ...newAttendance, attendance_time: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Notes / Reason</label>
                <input
                  type="text"
                  value={newAttendance.notes}
                  onChange={(e) => setNewAttendance({ ...newAttendance, notes: e.target.value })}
                  placeholder="e.g. Manually verified by advisor"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] mt-2"
              >
                Insert Attendance Entry
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: EDIT ATTENDANCE RECORD */}
      {showEditRecordModal && editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[24px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <div>
                <h3 className="font-display font-bold text-lg text-[#111827]">Edit Attendance Entry</h3>
                <p className="text-xs text-[#6B7280]">{editingRecord.student_name} ({editingRecord.roll_number})</p>
              </div>
              <button onClick={() => setShowEditRecordModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRecord} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Attendance Status</label>
                <select
                  value={editingRecord.status}
                  onChange={(e) => setEditingRecord({ ...editingRecord, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827]"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="excused">Excused</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Attendance Timestamp</label>
                <input
                  type="datetime-local"
                  value={editingRecord.attendance_time}
                  onChange={(e) => setEditingRecord({ ...editingRecord, attendance_time: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Notes / Justification</label>
                <input
                  type="text"
                  value={editingRecord.notes}
                  onChange={(e) => setEditingRecord({ ...editingRecord, notes: e.target.value })}
                  placeholder="e.g. Updated after leave submission"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] mt-2"
              >
                Save Updated Record
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
