import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { User } from '../types';
import * as XLSX from 'xlsx';
import {
  UserPlus,
  FileSpreadsheet,
  Download,
  Search,
  Trash2,
  X,
  Check,
  Upload,
  Smartphone,
  Sparkles,
  Edit,
  Eye,
  UserCheck,
  MapPin,
  Phone,
  Heart,
  Calendar,
  Shield,
  BookOpen,
  Mail,
  User as UserIcon,
  Key,
  Lock,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Filter,
  RefreshCw,
  Clock,
  Laptop,
  Globe,
  Users
} from 'lucide-react';

export const StudentManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'directory' | 'login_activity' | 'password_center'>('directory');

  // Main Data States
  const [students, setStudents] = useState<User[]>([]);
  const [summaryStats, setSummaryStats] = useState({
    totalStudents: 0,
    activeStudents: 0,
    inactiveStudents: 0,
    defaultPasswordCount: 0,
    customPasswordCount: 0,
    loggedInToday: 0,
    activeSessions: 0
  });

  // Filter & Search States
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [section, setSection] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Bulk Selection State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Modals Visibility
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkResetModal, setShowBulkResetModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Active Target Objects for Modals
  const [viewingStudentProfile, setViewingStudentProfile] = useState<{
    profile: User;
    attendanceSummary: { overallRate: number; presentCount: number; absentCount: number; lastAttendanceDate: string | null };
    qrScanHistory: any[];
    loginHistory: any[];
  } | null>(null);

  const [studentToDelete, setStudentToDelete] = useState<User | null>(null);

  const [resetPassTarget, setResetPassTarget] = useState<User | null>(null);
  const [resetPassType, setResetPassType] = useState<'default' | 'custom'>('default');
  const [customGeneratedPassword, setCustomGeneratedPassword] = useState('');
  const [bulkResetType, setBulkResetType] = useState<'default' | 'custom'>('default');
  const [bulkCustomPass, setBulkCustomPass] = useState('');

  const [editingStudent, setEditingStudent] = useState<{
    id: string;
    name: string;
    roll_number: string;
    email: string;
    department: string;
    year: string;
    section: string;
    phone: string;
    profile_photo: string;
    dob: string;
    gender: string;
    blood_group: string;
    address: string;
    parent_name: string;
    parent_phone: string;
    bio: string;
    status: string;
    admission_year: string;
    new_password?: string;
  } | null>(null);

  // New Student Form State
  const [newStudent, setNewStudent] = useState({
    name: '',
    roll_number: '',
    vh_number: '',
    email: '',
    department: 'AI & Data Science',
    year: '3',
    section: 'A',
    phone: '',
    profile_photo: '',
    dob: '',
    gender: 'Male',
    blood_group: 'O+',
    address: '',
    parent_name: '',
    parent_phone: '',
    bio: '',
    status: 'Active',
    admission_year: new Date().getFullYear().toString(),
    username: ''
  });

  // Login Activity & Audit Logs
  const [loginLogs, setLoginLogs] = useState<any[]>([]);
  const [loginStats, setLoginStats] = useState({ totalStudents: 0, loggedInToday: 0, activeRightNow: 0 });
  const [passwordAuditLogs, setPasswordAuditLogs] = useState<any[]>([]);

  // Fetch Main Student List and Dashboard Summary Stats
  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (department) params.append('department', department);
      if (year) params.append('year', year);
      if (section) params.append('section', section);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/students?${params.toString()}`);
      setStudents(res.data.students || []);
      if (res.data.summaryStats) {
        setSummaryStats(res.data.summaryStats);
      }
    } catch (err) {
      console.error('Failed to load students', err);
    }
  };

  // Fetch Login Monitoring Activity
  const fetchLoginActivity = async () => {
    try {
      const res = await api.get('/students/login-activity');
      setLoginLogs(res.data.logs || []);
      if (res.data.stats) setLoginStats(res.data.stats);
    } catch (err) {
      console.error('Failed to load login activity', err);
    }
  };

  // Fetch Password Audit Logs History
  const fetchPasswordAuditLogs = async () => {
    try {
      const res = await api.get('/students/password-audit-logs');
      setPasswordAuditLogs(res.data.logs || []);
    } catch (err) {
      console.error('Failed to load password audit logs', err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [search, department, year, section, statusFilter]);

  useEffect(() => {
    if (activeTab === 'login_activity') fetchLoginActivity();
    if (activeTab === 'password_center') fetchPasswordAuditLogs();
  }, [activeTab]);

  // Bulk Selection Checkbox Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedStudentIds(students.map((st) => st.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Add Single Student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/students', newStudent);
      alert('✅ Student account created successfully!');
      setShowAddModal(false);
      setNewStudent({
        name: '',
        roll_number: '',
        vh_number: '',
        email: '',
        department: 'AI & Data Science',
        year: '3',
        section: 'A',
        phone: '',
        profile_photo: '',
        dob: '',
        gender: 'Male',
        blood_group: 'O+',
        address: '',
        parent_name: '',
        parent_phone: '',
        bio: '',
        status: 'Active',
        admission_year: new Date().getFullYear().toString(),
        username: ''
      });
      fetchStudents();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to add student'}`);
    }
  };

  // Open Full Profile View Modal (Fetches full record + attendance summary + QR scan history + login logs)
  const openFullProfileView = async (st: User) => {
    try {
      const res = await api.get(`/students/${st.id}/profile-details`);
      setViewingStudentProfile(res.data);
      setShowViewModal(true);
    } catch (err: any) {
      alert('Failed to load full student profile details.');
    }
  };

  // Open Edit Modal
  const openEditModal = (st: User) => {
    setEditingStudent({
      id: st.id,
      name: st.name,
      roll_number: st.roll_number || '',
      email: st.email,
      department: st.department || 'AI & Data Science',
      year: String(st.year || 3),
      section: st.section || 'A',
      phone: st.phone || '',
      profile_photo: st.profile_photo || '',
      dob: st.dob || '',
      gender: st.gender || 'Male',
      blood_group: st.blood_group || 'O+',
      address: st.address || '',
      parent_name: st.parent_name || '',
      parent_phone: st.parent_phone || '',
      bio: st.bio || '',
      status: st.status || 'Active',
      admission_year: (st as any).admission_year ? String((st as any).admission_year) : new Date().getFullYear().toString(),
      new_password: ''
    });
    setShowEditModal(true);
  };

  // Handle Update Student Submit
  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    try {
      await api.put(`/students/${editingStudent.id}`, editingStudent);
      alert('✅ Student details updated successfully!');
      setShowEditModal(false);
      setEditingStudent(null);
      fetchStudents();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to update student'}`);
    }
  };

  // Trigger Single Student Permanent Delete Warning
  const triggerDeleteStudent = (st: User) => {
    setStudentToDelete(st);
    setShowDeleteConfirmModal(true);
  };

  // Confirm Single Student Permanent Delete
  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      await api.delete(`/students/${studentToDelete.id}`);
      alert(`✅ Permanently deleted account and all records for ${studentToDelete.name}`);
      setShowDeleteConfirmModal(false);
      setStudentToDelete(null);
      setShowViewModal(false);
      fetchStudents();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to delete student'}`);
    }
  };

  // Confirm Bulk Delete
  const confirmBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return;
    try {
      const res = await api.post('/students/bulk-delete', { studentIds: selectedStudentIds });
      alert(`✅ ${res.data.message}`);
      setSelectedStudentIds([]);
      setShowBulkDeleteModal(false);
      fetchStudents();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to bulk delete students'}`);
    }
  };

  // Open Reset Password Modal
  const openResetPasswordModal = (st: User) => {
    setResetPassTarget(st);
    setResetPassType('default');
    setCustomGeneratedPassword('');
    setShowResetPasswordModal(true);
  };

  // Submit Password Reset
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassTarget) return;

    try {
      const res = await api.post(`/students/${resetPassTarget.id}/reset-password`, {
        resetType: resetPassType,
        customPassword: customGeneratedPassword
      });
      alert(`✅ ${res.data.message}`);
      setShowResetPasswordModal(false);
      setResetPassTarget(null);
      fetchStudents();
      if (activeTab === 'password_center') fetchPasswordAuditLogs();
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to reset password'}`);
    }
  };

  // Download Recommended Excel Template (.xlsx)
  const downloadRecommendedExcelTemplate = () => {
    const templateData = [
      {
        'Register No*': '113024243032',
        'Student Name*': 'Dhanush',
        'Department*': 'AI & DS',
        'Course': 'B.Tech AI & DS',
        'Year*': 3,
        'Semester*': 5,
        'Section*': 'C',
        'Class Portal ID*': 'AI3C',
        'VH No': 'VH13936',
        'Student Email': 'dhanush@velhightech.com',
        'Student Phone': '9876543210',
        'Parent Name': 'Mr. Kumar',
        'Parent Phone': '9876500000',
        'Blood Group': 'O+',
        'Gender': 'Male',
        'Username': '113024243032',
        'Default Password': '1234',
        'Roll No': 1
      },
      {
        'Register No*': '113024243033',
        'Student Name*': 'Aravind Kumar',
        'Department*': 'AI & DS',
        'Course': 'B.Tech AI & DS',
        'Year*': 3,
        'Semester*': 5,
        'Section*': 'C',
        'Class Portal ID*': 'AI3C',
        'VH No': 'VH13937',
        'Student Email': 'aravind@velhightech.com',
        'Student Phone': '9876543211',
        'Parent Name': 'Mr. Raman',
        'Parent Phone': '9876500001',
        'Blood Group': 'A+',
        'Gender': 'Male',
        'Username': '113024243033',
        'Default Password': '1234',
        'Roll No': 2
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Student_Import_Template');
    XLSX.writeFile(wb, 'KANDRIX_AI_Recommended_Student_Import_Template.xlsx');
  };

  // Excel Bulk Import Parsing
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert('Excel file is empty!');
          return;
        }

        const res = await api.post('/students/bulk-import', { students: data });
        alert(`✅ Bulk import completed!\n${res.data.message}`);
        setShowImportModal(false);
        fetchStudents();
      } catch (err: any) {
        alert(`❌ Error parsing Excel file: ${err.response?.data?.error || err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  // Export Security & Password Status Report to Excel (.xlsx)
  const handleExportSecurityReport = () => {
    const exportData = (selectedStudentIds.length > 0
      ? students.filter((st) => selectedStudentIds.includes(st.id))
      : students
    ).map((st) => {
      const vh = (st as any).vh_number || (st.roll_number ? 'VH' + st.roll_number.slice(-5) : 'VH13936');
      const email = st.email || `${vh.toLowerCase()}@velhightech.com`;
      const isDefault = Boolean((st as any).password_status === 'Default Password' || (st as any).must_change_password === 1);
      const isBound = Boolean((st as any).device_fingerprint);

      return {
        'Register Number': st.roll_number,
        'Student Name': st.name,
        'VH Number': vh,
        'Official Email': email,
        Department: st.department || 'AI & DS',
        Year: st.year || 3,
        Section: st.section || 'A',
        'Account Status': st.status || 'Active',
        'Password Security Status': isDefault ? 'Default Password (Action Required)' : 'Custom Password (Secured)',
        'Mandatory Password Reset Flag': isDefault ? 'Yes - Action Required' : 'No - Standard',
        'Password Changed Date': (st as any).password_changed_at ? new Date((st as any).password_changed_at).toLocaleString() : 'N/A',
        'Hardware Device Registered': isBound ? 'Bound' : 'Not Registered'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Security & Passwords');
    XLSX.writeFile(wb, `Student_Security_Password_Status_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Bulk Reset Password Handler
  const handleBulkResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) return;

    try {
      const res = await api.post('/students/bulk-reset-passwords', {
        studentIds: selectedStudentIds,
        resetType: bulkResetType,
        customPassword: bulkCustomPass
      });

      alert(res.data.message || 'Bulk password reset successful!');
      setShowBulkResetModal(false);
      setSelectedStudentIds([]);
      fetchStudents();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to execute bulk password reset.');
    }
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const exportData = (selectedStudentIds.length > 0
      ? students.filter((st) => selectedStudentIds.includes(st.id))
      : students
    ).map((st) => {
      const vh = (st as any).vh_number || (st.roll_number ? 'VH' + st.roll_number.slice(-5) : 'VH13936');
      const email = `${vh.toLowerCase()}@velhightech.com`;
      const attPct = typeof st.attendance_percentage === 'number' ? st.attendance_percentage : 100;
      return {
        'Student Name': st.name,
        'Register Number': st.roll_number,
        'VH Number': vh,
        'Official Email ID': email,
        'Phone Number': st.phone || 'N/A',
        Department: st.department || 'AI & DS',
        Year: st.year || 3,
        Section: st.section || 'A',
        'Attendance %': `${attPct}%`,
        'Account Status': st.status || 'Active'
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, `EliteMinds_Students_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to CSV (.csv)
  const handleExportCSV = () => {
    const targetList = selectedStudentIds.length > 0
      ? students.filter((st) => selectedStudentIds.includes(st.id))
      : students;

    let csv = 'Student Name,Register Number,VH Number,Official Email ID,Phone Number,Department,Year,Section,Attendance %,Account Status\n';
    targetList.forEach((st) => {
      const vh = (st as any).vh_number || (st.roll_number ? 'VH' + st.roll_number.slice(-5) : 'VH13936');
      const email = `${vh.toLowerCase()}@velhightech.com`;
      const attPct = typeof st.attendance_percentage === 'number' ? st.attendance_percentage : 100;
      csv += `"${st.name}","${st.roll_number}","${vh}","${email}","${st.phone || ''}","${st.department || 'AI & DS'}","${st.year || 3}","${st.section || 'A'}","${attPct}%","${st.status || 'Active'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Students_Export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Export to Printable PDF
  const handleExportPDF = () => {
    const targetList = selectedStudentIds.length > 0
      ? students.filter((st) => selectedStudentIds.includes(st.id))
      : students;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to generate PDF report.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Student Directory Export - KANDRIX AI</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #111827; }
          .header { border-bottom: 2px solid #2563EB; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: 800; color: #111827; margin: 0; }
          .subtitle { font-size: 13px; color: #6B7280; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
          th, td { border: 1px solid #E2E8F0; padding: 8px 10px; text-align: left; }
          th { background: #F1F5F9; font-weight: 700; color: #334155; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">KANDRIX AI ATTENDANCE SYSTEM</h1>
          <p class="subtitle">Official Enrolled Student Directory Report (${targetList.length} Students)</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Register Number</th>
              <th>Student Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Class</th>
              <th>Contact Phone</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${targetList.map((st, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td style="font-family: monospace; font-weight: bold;">${st.roll_number}</td>
                <td style="font-weight: bold;">${st.name}</td>
                <td>${st.email}</td>
                <td>${st.department || 'AI & DS'}</td>
                <td>Yr ${st.year || 3} • Sec ${st.section || 'A'}</td>
                <td>${st.phone || 'N/A'}</td>
                <td>${st.status || 'Active'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
  const handleForcePasswordChange = async (student: User) => {
    if (confirm(`Enforce mandatory password change on next login for ${student.name}?`)) {
      try {
        await api.post(`/students/${student.id}/force-password-change`);
        alert(`✅ Mandatory password change flagged for ${student.name}`);
        fetchStudents();
      } catch (err: any) {
        alert(`❌ Failed: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  const handleToggleAccountStatus = async (student: User, newStatus: string) => {
    if (confirm(`Change account status of ${student.name} to "${newStatus}"?`)) {
      try {
        await api.put(`/students/${student.id}/status`, { status: newStatus });
        alert(`✅ Account status changed to ${newStatus}`);
        fetchStudents();
      } catch (err: any) {
        alert(`❌ Failed to update status: ${err.response?.data?.error || err.message}`);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Header & Sub-Tabs Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-[#111827]">
            Student Management & Security Control Center
          </h1>
          <p className="text-xs text-[#6B7280] font-medium mt-1">
            Complete CRUD administration, login monitoring, and password audit center
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedStudentIds.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="px-4 py-2 rounded-full bg-rose-600 text-xs font-extrabold text-white hover:bg-rose-700 shadow-floating transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedStudentIds.length})</span>
            </button>
          )}

          <button
            onClick={() => setShowImportModal(true)}
            className="px-3.5 py-2 rounded-full bg-white border border-[#E7E7E7] text-xs font-bold text-[#111827] hover:bg-[#FAFAFA] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#12B76A]" />
            <span>Import Excel</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-full bg-white border border-[#E7E7E7] text-xs font-bold text-[#111827] hover:bg-[#FAFAFA] transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-4 h-4 text-[#4F7CFF]" />
            <span>Export XLSX</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-[#6D5DFC] to-[#4F7CFF] text-xs font-extrabold text-white shadow-floating hover:from-[#5b4be0] hover:to-[#3b68ee] transition-all flex items-center gap-1.5 active:scale-98"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* PREMIUM ADMIN DASHBOARD STATS CARDS GRID */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-[#E7E7E7] shadow-enterprise text-center">
          <span className="text-[10px] text-[#6B7280] font-extrabold uppercase tracking-wider block">👨🎓 Total Students</span>
          <span className="font-display font-extrabold text-xl text-[#111827] block mt-1">{summaryStats.totalStudents}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-[#ECFDF5] shadow-enterprise text-center">
          <span className="text-[10px] text-[#12B76A] font-extrabold uppercase tracking-wider block">🟢 Active</span>
          <span className="font-display font-extrabold text-xl text-[#12B76A] block mt-1">{summaryStats.activeStudents}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-rose-100 shadow-enterprise text-center">
          <span className="text-[10px] text-rose-600 font-extrabold uppercase tracking-wider block">🔴 Inactive</span>
          <span className="font-display font-extrabold text-xl text-rose-600 block mt-1">{summaryStats.inactiveStudents}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-enterprise text-center">
          <span className="text-[10px] text-amber-600 font-extrabold uppercase tracking-wider block">🔐 Default Password</span>
          <span className="font-display font-extrabold text-xl text-amber-600 block mt-1">{summaryStats.defaultPasswordCount}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-[#6D5DFC]/20 shadow-enterprise text-center">
          <span className="text-[10px] text-[#6D5DFC] font-extrabold uppercase tracking-wider block">🛡 Custom Password</span>
          <span className="font-display font-extrabold text-xl text-[#6D5DFC] block mt-1">{summaryStats.customPasswordCount}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-blue-200 shadow-enterprise text-center">
          <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider block">🟢 Logged In Today</span>
          <span className="font-display font-extrabold text-xl text-blue-600 block mt-1">{summaryStats.loggedInToday}</span>
        </div>
        <div className="bg-white p-3.5 rounded-2xl border border-purple-200 shadow-enterprise text-center">
          <span className="text-[10px] text-purple-600 font-extrabold uppercase tracking-wider block">🟣 Active Sessions</span>
          <span className="font-display font-extrabold text-xl text-purple-600 block mt-1">{summaryStats.activeSessions}</span>
        </div>
      </div>

      {/* NAVIGATION SUB-TABS */}
      <div className="flex items-center gap-2 border-b border-[#E7E7E7] pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveTab('directory')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'directory'
              ? 'bg-[#111827] text-white shadow-sm'
              : 'bg-[#FAFAFA] text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Student Directory & CRUD</span>
        </button>

        <button
          onClick={() => setActiveTab('login_activity')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'login_activity'
              ? 'bg-[#6D5DFC] text-white shadow-sm'
              : 'bg-[#FAFAFA] text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Student Login Activity</span>
        </button>

        <button
          onClick={() => setActiveTab('password_center')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'password_center'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-[#FAFAFA] text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Password Control & Audit Logs</span>
        </button>
      </div>

      {/* ================================================== */}
      {/* TAB 1: STUDENT DIRECTORY & CRUD */}
      {/* ================================================== */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Filters & Search Bar */}
          <div className="bg-white p-4 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <input
                type="text"
                placeholder="Search by student name, register no, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] placeholder-[#9CA3AF] pl-9 focus:outline-none focus:border-[#6D5DFC] focus:bg-white font-medium"
              />
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3" />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="px-3 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] focus:outline-none font-medium"
              >
                <option value="">All Departments</option>
                <option value="AI & Data Science">AI & Data Science</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Electronics">Electronics</option>
                <option value="Mechanical">Mechanical</option>
              </select>

              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="px-3 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] focus:outline-none font-medium"
              >
                <option value="">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>

              <select
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="px-3 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] focus:outline-none font-medium"
              >
                <option value="">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] focus:outline-none font-medium"
              >
                <option value="">All Account Status</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
              </select>

              {/* Export Buttons */}
              <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
                {selectedStudentIds.length > 0 && (
                  <button
                    onClick={() => setShowBulkResetModal(true)}
                    className="px-3 py-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Bulk Reset ({selectedStudentIds.length})
                  </button>
                )}
                <button
                  onClick={handleExportSecurityReport}
                  className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-bold flex items-center gap-1.5"
                  title="Export Security & Password Status Report (Excel)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-600" />
                  Security Report
                </button>
                <button
                  onClick={handleExportCSV}
                  className="p-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] hover:bg-[#F3F0FF] text-xs font-bold"
                  title="Export CSV"
                >
                  CSV
                </button>
                <button
                  onClick={handleExportPDF}
                  className="p-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] hover:bg-[#F3F0FF] text-xs font-bold"
                  title="Export PDF"
                >
                  PDF
                </button>
              </div>
            </div>
          </div>

          {/* Main Table Container */}
          <div className="bg-white rounded-[24px] border border-[#E7E7E7] shadow-enterprise overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] tracking-wider sticky top-0 font-bold">
                  <tr>
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        checked={students.length > 0 && selectedStudentIds.length === students.length}
                        onChange={handleSelectAll}
                        className="rounded border-[#E7E7E7] text-[#6D5DFC]"
                      />
                    </th>
                    <th className="p-4">Student Name</th>
                    <th className="p-4">Register Number</th>
                    <th className="p-4">VH Number</th>
                    <th className="p-4">Official Email ID</th>
                    <th className="p-4">Phone Number</th>
                    <th className="p-4">Attendance %</th>
                    <th className="p-4">Account Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-10 text-center text-[#6B7280]">
                        No student accounts found matching your active filters.
                      </td>
                    </tr>
                  ) : (
                    students.map((st) => {
                      const isSelected = selectedStudentIds.includes(st.id);
                      const isDefaultPass = Boolean((st as any).password_status === 'Default Password');
                      const displayVH = (st as any).vh_number || (st.roll_number ? 'VH' + st.roll_number.slice(-5) : 'VH13936');
                      const displayEmail = st.email || `${displayVH.toLowerCase()}@velhightech.com`;

                      return (
                        <tr
                          key={st.id}
                          className={`transition-colors ${isSelected ? 'bg-[#F3F0FF]/40' : 'hover:bg-[#FAFAFA]'}`}
                        >
                          <td className="p-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectOne(st.id)}
                              className="rounded border-[#E7E7E7] text-[#6D5DFC]"
                            />
                          </td>
                          <td className="p-4 flex items-center gap-3">
                            <img
                              src={st.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                              alt=""
                              className="w-9 h-9 rounded-full border border-[#E7E7E7] object-cover shadow-sm cursor-pointer"
                              onClick={() => openFullProfileView(st)}
                            />
                            <div>
                              <p
                                onClick={() => openFullProfileView(st)}
                                className="font-bold text-[#111827] hover:text-[#6D5DFC] cursor-pointer"
                              >
                                {st.name}
                              </p>
                              <span className="text-[10px] text-[#6B7280]">Yr {st.year || 3} • Sec {st.section || 'A'}</span>
                            </div>
                          </td>
                          <td className="p-4 font-mono text-[#111827] font-bold">{st.roll_number}</td>
                          <td className="p-4 font-mono text-[#6D5DFC] font-extrabold">{displayVH}</td>
                          <td className="p-4 font-mono text-xs text-[#12B76A] font-bold">{displayEmail}</td>
                          <td className="p-4 text-[#6B7280] font-mono text-[11px]">{st.phone || 'N/A'}</td>
                          <td className="p-4">
                            {(() => {
                              const attVal = typeof st.attendance_percentage === 'number' ? st.attendance_percentage : 100;
                              return (
                                <div className="flex items-center gap-2">
                                  <span className={`font-mono font-bold ${
                                    attVal >= 75 ? 'text-[#12B76A]' : 'text-rose-600'
                                  }`}>
                                    {attVal}%
                                  </span>
                                  <div className="w-14 bg-[#FAFAFA] rounded-full h-1.5 overflow-hidden border border-[#E7E7E7]">
                                    <div
                                      className={`h-full rounded-full ${
                                        attVal >= 75 ? 'bg-[#12B76A]' : 'bg-rose-500'
                                      }`}
                                      style={{ width: `${attVal}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                                isDefaultPass
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-[#F3F0FF] text-[#6D5DFC] border-[#6D5DFC]/20'
                              }`}
                            >
                              {isDefaultPass ? 'Default Password' : 'Custom Password'}
                            </span>
                          </td>
                          <td className="p-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-extrabold border ${
                                st.status === 'Inactive'
                                  ? 'bg-gray-100 text-gray-700 border-gray-200'
                                  : st.status === 'Suspended'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-[#ECFDF5] text-[#12B76A] border-[#12B76A]/20'
                              }`}
                            >
                              {st.status || 'Active'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openFullProfileView(st)}
                                className="p-1.5 rounded-full text-[#6D5DFC] bg-[#F3F0FF] hover:bg-[#6D5DFC] hover:text-white transition-all"
                                title="View Full Profile Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openEditModal(st)}
                                className="p-1.5 rounded-full text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                                title="Edit Student Details"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => openResetPasswordModal(st)}
                                className="p-1.5 rounded-full text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors"
                                title="Reset Student Password (Default 1234)"
                              >
                                <Key className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleForcePasswordChange(st)}
                                className="p-1.5 rounded-full text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors"
                                title="Force Password Change on Next Login"
                              >
                                <Shield className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleAccountStatus(st, st.status === 'Locked' ? 'Active' : 'Locked')}
                                className={`p-1.5 rounded-full transition-colors ${st.status === 'Locked' ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'}`}
                                title={st.status === 'Locked' ? 'Unlock Student Account' : 'Lock Student Account'}
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => triggerDeleteStudent(st)}
                                className="p-1.5 rounded-full text-[#6B7280] hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Delete Student Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* TAB 2: STUDENT LOGIN ACTIVITY MONITORING */}
      {/* ================================================== */}
      {activeTab === 'login_activity' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-[#111827]">Real-Time Student Login Activity Monitor</h3>
                <p className="text-xs text-[#6B7280] font-medium">Tracks every student authentication session, browser user-agent, and IP address</p>
              </div>
              <button
                onClick={fetchLoginActivity}
                className="px-3.5 py-1.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] text-xs font-bold hover:bg-[#6D5DFC] hover:text-white transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Activity
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="bg-[#FAF9FF] p-4 rounded-2xl border border-[#6D5DFC]/20 text-center">
                <span className="text-xs text-[#6D5DFC] font-bold block">Total Enrolled Students</span>
                <span className="font-display font-extrabold text-2xl text-[#111827] block mt-1">{loginStats.totalStudents}</span>
              </div>
              <div className="bg-[#ECFDF5] p-4 rounded-2xl border border-[#12B76A]/20 text-center">
                <span className="text-xs text-[#12B76A] font-bold block">Logged In Today</span>
                <span className="font-display font-extrabold text-2xl text-[#12B76A] block mt-1">{loginStats.loggedInToday}</span>
              </div>
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-200 text-center">
                <span className="text-xs text-blue-600 font-bold block">Active Right Now (30m)</span>
                <span className="font-display font-extrabold text-2xl text-blue-600 block mt-1">{loginStats.activeRightNow}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[24px] border border-[#E7E7E7] shadow-enterprise overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-4">Student Name</th>
                    <th className="p-4">Register Number</th>
                    <th className="p-4">Class</th>
                    <th className="p-4">Login Time</th>
                    <th className="p-4">Device</th>
                    <th className="p-4">Browser</th>
                    <th className="p-4">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  {loginLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#6B7280]">
                        No student login activity recorded yet.
                      </td>
                    </tr>
                  ) : (
                    loginLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="p-4 font-bold text-[#111827] flex items-center gap-2">
                          <img
                            src={log.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                            alt=""
                            className="w-7 h-7 rounded-full border border-[#E7E7E7] object-cover"
                          />
                          <span>{log.student_name}</span>
                        </td>
                        <td className="p-4 font-mono text-[#6D5DFC] font-bold">{log.roll_number}</td>
                        <td className="p-4 text-[#6B7280]">Yr {log.year || 3} • Sec {log.section || 'A'}</td>
                        <td className="p-4 font-mono text-[#111827]">{new Date(log.login_time).toLocaleString()}</td>
                        <td className="p-4 flex items-center gap-1.5 font-medium">
                          <Laptop className="w-3.5 h-3.5 text-[#6B7280]" />
                          <span>{log.device}</span>
                        </td>
                        <td className="p-4 font-medium">{log.browser}</td>
                        <td className="p-4 font-mono text-[11px] text-[#6D5DFC] font-bold">{log.ip_address}</td>
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
      {/* TAB 3: PASSWORD CONTROL CENTER & AUDIT LOGS */}
      {/* ================================================== */}
      {activeTab === 'password_center' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-base text-[#111827]">Password Security & Audit Center</h3>
                <p className="text-xs text-[#6B7280] font-medium">Enforces bcrypt hashing, default password tracking, and password reset logs</p>
              </div>
              <button
                onClick={fetchPasswordAuditLogs}
                className="px-3.5 py-1.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] text-xs font-bold hover:bg-[#6D5DFC] hover:text-white transition-all flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Audit Logs
              </button>
            </div>

            {/* Audit Log History Table */}
            <div className="overflow-x-auto border border-[#E7E7E7] rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] font-bold">
                  <tr>
                    <th className="p-3.5">Student Name</th>
                    <th className="p-3.5">Register Number</th>
                    <th className="p-3.5">Action Event</th>
                    <th className="p-3.5">Changed By</th>
                    <th className="p-3.5">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  {passwordAuditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[#6B7280]">
                        No password change or reset audit logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    passwordAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="p-3.5 font-bold text-[#111827]">{log.student_name}</td>
                        <td className="p-3.5 font-mono text-[#6D5DFC] font-bold">{log.roll_number}</td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20 text-[10px] font-bold">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3.5 font-semibold text-[#111827]">{log.changed_by}</td>
                        <td className="p-3.5 font-mono text-[#6B7280]">{new Date(log.changed_at).toLocaleString()}</td>
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
      {/* MODAL 1: ADD NEW STUDENT MODAL */}
      {/* ================================================== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[32px] p-6 sm:p-8 border border-[#E7E7E7] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto relative animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <div>
                <h3 className="font-display font-extrabold text-lg text-[#111827]">Add New Student Account</h3>
                <p className="text-xs text-[#6B7280] font-medium">Create a student profile with mandatory unique register & email validation</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-3">
              {/* Student Details */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-[#6D5DFC] uppercase tracking-wider">Student Details</h4>
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    placeholder="e.g. ABASKAR N"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#111827] mb-1">Register Number *</label>
                    <input
                      type="text"
                      required
                      value={newStudent.roll_number}
                      onChange={(e) => setNewStudent({ ...newStudent, roll_number: e.target.value })}
                      placeholder="e.g. 113024243032"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#111827] mb-1">VH Number *</label>
                    <input
                      type="text"
                      required
                      value={newStudent.vh_number}
                      onChange={(e) => setNewStudent({ ...newStudent, vh_number: e.target.value.toUpperCase() })}
                      placeholder="e.g. VH13936"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#6D5DFC] font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#ECFDF5] border border-[#12B76A]/30 flex items-center justify-between text-xs">
                  <span className="text-[11px] font-bold text-[#12B76A]">Official Generated Email:</span>
                  <span className="font-mono font-extrabold text-[#12B76A]">
                    {(newStudent.vh_number || 'VHXXXXX').toLowerCase()}@velhightech.com
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#111827] mb-1">Department</label>
                    <select
                      value={newStudent.department}
                      onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                    >
                      <option value="AI & Data Science">AI & Data Science</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Mechanical">Mechanical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#111827] mb-1">Year</label>
                    <select
                      value={newStudent.year}
                      onChange={(e) => setNewStudent({ ...newStudent, year: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                    >
                      <option value="1">1st Year</option>
                      <option value="2">2nd Year</option>
                      <option value="3">3rd Year</option>
                      <option value="4">4th Year</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#111827] mb-1">Section</label>
                    <select
                      value={newStudent.section}
                      onChange={(e) => setNewStudent({ ...newStudent, section: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                    >
                      <option value="A">Sec A</option>
                      <option value="B">Sec B</option>
                      <option value="C">Sec C</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#111827] mb-1">Phone Number (Unique)</label>
                    <input
                      type="text"
                      value={newStudent.phone}
                      onChange={(e) => setNewStudent({ ...newStudent, phone: e.target.value })}
                      placeholder="+91-9876543210"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#111827] mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={newStudent.dob}
                      onChange={(e) => setNewStudent({ ...newStudent, dob: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#111827] mb-1">Gender</label>
                    <select
                      value={newStudent.gender}
                      onChange={(e) => setNewStudent({ ...newStudent, gender: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#111827] mb-1">Admission Year</label>
                    <input
                      type="number"
                      value={newStudent.admission_year}
                      onChange={(e) => setNewStudent({ ...newStudent, admission_year: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#111827] mb-1">Parent Name</label>
                    <input
                      type="text"
                      value={newStudent.parent_name}
                      onChange={(e) => setNewStudent({ ...newStudent, parent_name: e.target.value })}
                      placeholder="Parent Name"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#111827] mb-1">Parent Phone</label>
                    <input
                      type="text"
                      value={newStudent.parent_phone}
                      onChange={(e) => setNewStudent({ ...newStudent, parent_phone: e.target.value })}
                      placeholder="Parent Phone"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Address</label>
                  <input
                    type="text"
                    value={newStudent.address}
                    onChange={(e) => setNewStudent({ ...newStudent, address: e.target.value })}
                    placeholder="Full Address"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-2 pt-2 border-t border-[#E7E7E7]">
                <h4 className="text-xs font-bold text-[#6D5DFC] uppercase tracking-wider">Account Details</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#111827] mb-1">Account Status</label>
                    <select
                      value={newStudent.status}
                      onChange={(e) => setNewStudent({ ...newStudent, status: e.target.value })}
                      className="w-full px-2.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#111827] mb-1">Default Password</label>
                    <input
                      type="text"
                      disabled
                      value="1234 (Auto Generated)"
                      className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/20 text-xs font-mono font-bold text-[#6D5DFC]"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/20 text-[11px] text-[#6D5DFC] font-medium">
                  Auto-generates default password <code className="font-mono bg-white px-1.5 py-0.5 rounded font-bold border border-[#6D5DFC]/30">1234</code> hashed with bcrypt. Force password setup is triggered automatically on first login.
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E7E7]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-full bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827] hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#6D5DFC] font-extrabold text-xs text-white shadow-floating hover:bg-[#5b4be0]"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* MODAL 2: EDIT STUDENT MODAL */}
      {/* ================================================== */}
      {showEditModal && editingStudent && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[32px] p-6 sm:p-8 border border-[#E7E7E7] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto relative animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <div>
                <h3 className="font-display font-extrabold text-lg text-[#111827]">Edit Student Account</h3>
                <p className="text-xs text-[#6B7280] font-medium">Modify credentials, section, department, and status</p>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudent} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  value={editingStudent.name}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Register Number</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.roll_number}
                    onChange={(e) => setEditingStudent({ ...editingStudent, roll_number: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editingStudent.email}
                    onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Department</label>
                  <select
                    value={editingStudent.department}
                    onChange={(e) => setEditingStudent({ ...editingStudent, department: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    <option value="Computer Science">Computer Science</option>
                    <option value="AI & Data Science">AI & Data Science</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mechanical">Mechanical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Year</label>
                  <select
                    value={editingStudent.year}
                    onChange={(e) => setEditingStudent({ ...editingStudent, year: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Section</label>
                  <select
                    value={editingStudent.section}
                    onChange={(e) => setEditingStudent({ ...editingStudent, section: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    <option value="A">Sec A</option>
                    <option value="B">Sec B</option>
                    <option value="C">Sec C</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingStudent.phone}
                    onChange={(e) => setEditingStudent({ ...editingStudent, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Account Status</label>
                  <select
                    value={editingStudent.status}
                    onChange={(e) => setEditingStudent({ ...editingStudent, status: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Parent Name</label>
                  <input
                    type="text"
                    value={editingStudent.parent_name}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parent_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Parent Phone</label>
                  <input
                    type="text"
                    value={editingStudent.parent_phone}
                    onChange={(e) => setEditingStudent({ ...editingStudent, parent_phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E7E7E7]">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 rounded-full bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-[#6D5DFC] font-extrabold text-xs text-white shadow-floating hover:bg-[#5b4be0]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* MODAL 3: FULL STUDENT PROFILE VIEW MODAL */}
      {/* ================================================== */}
      {showViewModal && viewingStudentProfile && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[32px] p-6 sm:p-8 border border-[#E7E7E7] shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto relative animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E7E7]">
              <div className="flex items-center gap-3">
                <img
                  src={viewingStudentProfile.profile.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt=""
                  className="w-16 h-16 rounded-full border-2 border-[#6D5DFC]/30 object-cover shadow-sm"
                />
                <div>
                  <h3 className="font-display font-extrabold text-xl text-[#111827]">{viewingStudentProfile.profile.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20 text-[10px] font-mono font-bold">
                      {viewingStudentProfile.profile.roll_number}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      viewingStudentProfile.profile.status === 'Suspended' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-[#ECFDF5] text-[#12B76A] border-[#12B76A]/20'
                    }`}>
                      {viewingStudentProfile.profile.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowViewModal(false)}
                className="w-9 h-9 rounded-full bg-[#FAFAFA] text-[#6B7280] hover:text-[#111827] flex items-center justify-center border border-[#E7E7E7]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Attendance Summary Panel */}
            <div className="bg-[#FAF9FF] p-4 rounded-2xl border border-[#6D5DFC]/20 space-y-3">
              <h4 className="text-xs font-extrabold text-[#6D5DFC] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Attendance Summary
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white p-3 rounded-2xl border border-[#E7E7E7]">
                  <span className="text-[10px] text-[#6B7280] font-bold uppercase block">Overall Rate</span>
                  <span className="font-display font-extrabold text-xl text-[#6D5DFC] block mt-0.5">{viewingStudentProfile.attendanceSummary.overallRate}%</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-[#ECFDF5]">
                  <span className="text-[10px] text-[#12B76A] font-bold uppercase block">Present Count</span>
                  <span className="font-display font-extrabold text-xl text-[#12B76A] block mt-0.5">{viewingStudentProfile.attendanceSummary.presentCount}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-rose-100">
                  <span className="text-[10px] text-rose-600 font-bold uppercase block">Absent Count</span>
                  <span className="font-display font-extrabold text-xl text-rose-600 block mt-0.5">{viewingStudentProfile.attendanceSummary.absentCount}</span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-[#E7E7E7]">
                  <span className="text-[10px] text-[#6B7280] font-bold uppercase block">Last Attended</span>
                  <span className="font-mono text-xs font-bold text-[#111827] block mt-1">
                    {viewingStudentProfile.attendanceSummary.lastAttendanceDate
                      ? new Date(viewingStudentProfile.attendanceSummary.lastAttendanceDate).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* QR Scan History Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-[#6D5DFC]" /> QR Scan History ({viewingStudentProfile.qrScanHistory.length})
              </h4>
              <div className="overflow-x-auto border border-[#E7E7E7] rounded-2xl max-h-44">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[#64748B] uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Subject</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Time</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E7E7]">
                    {viewingStudentProfile.qrScanHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-[#6B7280]">
                          No QR scan records found.
                        </td>
                      </tr>
                    ) : (
                      viewingStudentProfile.qrScanHistory.map((rec) => (
                        <tr key={rec.id} className="hover:bg-[#FAFAFA]">
                          <td className="py-2.5 px-3 font-bold text-[#111827]">{rec.subject || 'Session Attendance'}</td>
                          <td className="py-2.5 px-3 font-mono">{rec.session_date || new Date(rec.attendance_time).toLocaleDateString()}</td>
                          <td className="py-2.5 px-3 font-mono text-[#6D5DFC] font-bold">{new Date(rec.attendance_time).toLocaleTimeString()}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20 font-bold text-[10px]">
                              {rec.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Login History */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#6D5DFC]" /> Recent Login History ({viewingStudentProfile.loginHistory.length})
              </h4>
              <div className="overflow-x-auto border border-[#E7E7E7] rounded-2xl max-h-40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAFAFA] border-b border-[#E7E7E7] text-[#64748B] uppercase text-[10px] font-bold">
                    <tr>
                      <th className="py-2.5 px-3">Date & Time</th>
                      <th className="py-2.5 px-3">Device</th>
                      <th className="py-2.5 px-3">Browser</th>
                      <th className="py-2.5 px-3">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E7E7]">
                    {viewingStudentProfile.loginHistory.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-4 text-center text-[#6B7280]">
                          No login history recorded yet.
                        </td>
                      </tr>
                    ) : (
                      viewingStudentProfile.loginHistory.map((log) => (
                        <tr key={log.id} className="hover:bg-[#FAFAFA]">
                          <td className="py-2.5 px-3 font-mono">{new Date(log.login_time).toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-medium">{log.device}</td>
                          <td className="py-2.5 px-3">{log.browser}</td>
                          <td className="py-2.5 px-3 font-mono text-[#6D5DFC] font-bold">{log.ip_address}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[#E7E7E7]">
              <button
                onClick={() => triggerDeleteStudent(viewingStudentProfile.profile)}
                className="px-4 py-2 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-100 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Delete Permanently
              </button>

              <button
                onClick={() => {
                  setShowViewModal(false);
                  openEditModal(viewingStudentProfile.profile);
                }}
                className="px-5 py-2.5 rounded-full bg-[#6D5DFC] text-white text-xs font-bold shadow-floating hover:bg-[#5b4be0] flex items-center gap-1.5"
              >
                <Edit className="w-4 h-4" /> Edit Student Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* MODAL 4: DELETE PERMANENTLY WARNING MODAL */}
      {/* ================================================== */}
      {showDeleteConfirmModal && studentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[28px] p-6 border border-rose-100 shadow-2xl space-y-4 text-center animate-fade-in relative">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-display font-extrabold text-lg text-[#111827]">
                Permanently Delete Student?
              </h3>
              <p className="text-xs text-[#6B7280] font-medium mt-2 leading-relaxed">
                Are you sure you want to permanently delete <strong>{studentToDelete.name}</strong> ({studentToDelete.roll_number})?
                <br /><br />
                <span className="text-rose-600 font-bold">This action cannot be undone.</span> All attendance records, login history, QR scan logs, and analytics data will be permanently removed from the database.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className="w-1/2 py-3 rounded-full bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827] hover:bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={confirmDeleteStudent}
                className="w-1/2 py-3 rounded-full bg-rose-600 text-white font-extrabold text-xs shadow-floating hover:bg-rose-700 transition-all"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* MODAL 5: BULK DELETE WARNING MODAL */}
      {/* ================================================== */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[28px] p-6 border border-rose-100 shadow-2xl space-y-4 text-center animate-fade-in relative">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div>
              <h3 className="font-display font-extrabold text-lg text-[#111827]">
                Bulk Delete {selectedStudentIds.length} Selected Students?
              </h3>
              <p className="text-xs text-[#6B7280] font-medium mt-2 leading-relaxed">
                Are you sure you want to permanently delete all {selectedStudentIds.length} selected student accounts?
                <br /><br />
                <span className="text-rose-600 font-bold">This action cannot be undone.</span> All associated attendance, login, and audit records will be removed.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                className="w-1/2 py-3 rounded-full bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827]"
              >
                Cancel
              </button>

              <button
                onClick={confirmBulkDelete}
                className="w-1/2 py-3 rounded-full bg-rose-600 text-white font-extrabold text-xs shadow-floating hover:bg-rose-700 transition-all"
              >
                Delete All Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* MODAL 6: RESET PASSWORD MODAL */}
      {/* ================================================== */}
      {showResetPasswordModal && resetPassTarget && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[28px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4 animate-fade-in relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <div>
                <h3 className="font-display font-bold text-lg text-[#111827]">🔑 Password Reset Control</h3>
                <p className="text-xs text-[#6B7280] font-medium">For {resetPassTarget.name} ({resetPassTarget.roll_number})</p>
              </div>
              <button onClick={() => setShowResetPasswordModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#111827]">Select Password Reset Option</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-3 rounded-2xl border border-[#E7E7E7] cursor-pointer hover:bg-[#FAFAFA]">
                    <input
                      type="radio"
                      name="resetType"
                      checked={resetPassType === 'default'}
                      onChange={() => setResetPassType('default')}
                      className="text-[#6D5DFC]"
                    />
                    <div>
                      <span className="text-xs font-bold text-[#111827] block">Reset to Default Password (1234)</span>
                      <span className="text-[10px] text-[#6B7280]">Resets password to "1234" and enforces mandatory password setup on next login.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-2xl border border-[#E7E7E7] cursor-pointer hover:bg-[#FAFAFA]">
                    <input
                      type="radio"
                      name="resetType"
                      checked={resetPassType === 'custom'}
                      onChange={() => setResetPassType('custom')}
                      className="text-[#6D5DFC]"
                    />
                    <div>
                      <span className="text-xs font-bold text-[#111827] block">Generate Custom Password</span>
                      <span className="text-[10px] text-[#6B7280]">Specify a custom password to assign directly.</span>
                    </div>
                  </label>
                </div>
              </div>

              {resetPassType === 'custom' && (
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">New Custom Password *</label>
                  <input
                    type="text"
                    required
                    value={customGeneratedPassword}
                    onChange={(e) => setCustomGeneratedPassword(e.target.value)}
                    placeholder="e.g. StudentPass@2026"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] font-mono"
                  />
                </div>
              )}

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                🛡 Security Policy: Actual passwords are standard bcrypt hashed. Password resets are logged in the Password Audit Logs.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E7E7]">
                <button
                  type="button"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="px-5 py-2.5 rounded-full bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-amber-600 font-extrabold text-xs text-white shadow-floating hover:bg-amber-700"
                >
                  Reset Password Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* MODAL 6B: BULK RESET PASSWORDS MODAL */}
      {/* ================================================== */}
      {showBulkResetModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[28px] p-6 border border-[#E7E7E7] shadow-2xl space-y-4 animate-fade-in relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <div>
                <h3 className="font-display font-bold text-lg text-[#111827]">🔑 Bulk Password Reset Control</h3>
                <p className="text-xs text-[#6B7280] font-medium">Reset passwords for {selectedStudentIds.length} selected student(s)</p>
              </div>
              <button onClick={() => setShowBulkResetModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkResetPasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#111827]">Select Password Reset Strategy</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-3 rounded-2xl border border-[#E7E7E7] cursor-pointer hover:bg-[#FAFAFA]">
                    <input
                      type="radio"
                      name="bulkResetType"
                      checked={bulkResetType === 'default'}
                      onChange={() => setBulkResetType('default')}
                      className="text-[#6D5DFC]"
                    />
                    <div>
                      <span className="text-xs font-bold text-[#111827] block">Reset All to Default Password (1234)</span>
                      <span className="text-[10px] text-[#6B7280]">Resets all selected accounts to "1234" and requires immediate password update on next login.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-3 rounded-2xl border border-[#E7E7E7] cursor-pointer hover:bg-[#FAFAFA]">
                    <input
                      type="radio"
                      name="bulkResetType"
                      checked={bulkResetType === 'custom'}
                      onChange={() => setBulkResetType('custom')}
                      className="text-[#6D5DFC]"
                    />
                    <div>
                      <span className="text-xs font-bold text-[#111827] block">Set Custom Temporary Password</span>
                      <span className="text-[10px] text-[#6B7280]">Specify a custom temporary password to apply to all selected students.</span>
                    </div>
                  </label>
                </div>
              </div>

              {bulkResetType === 'custom' && (
                <div>
                  <label className="block text-xs font-semibold text-[#111827] mb-1">New Custom Password *</label>
                  <input
                    type="text"
                    required
                    value={bulkCustomPass}
                    onChange={(e) => setBulkCustomPass(e.target.value)}
                    placeholder="e.g. TempPass@2026"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-xs text-[#111827] font-mono"
                  />
                </div>
              )}

              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                🛡 Security Compliance: New passwords will be hashed with bcrypt. Each reset action will be recorded in the Password Audit Logs.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E7E7E7]">
                <button
                  type="button"
                  onClick={() => setShowBulkResetModal(false)}
                  className="px-5 py-2.5 rounded-full bg-[#FAFAFA] border border-[#E7E7E7] text-xs font-bold text-[#111827]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-full bg-amber-600 font-extrabold text-xs text-white shadow-floating hover:bg-amber-700"
                >
                  Reset {selectedStudentIds.length} Passwords
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* MODAL 7: BULK IMPORT EXCEL MODAL */}
      {/* ================================================== */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[28px] p-6 sm:p-8 border border-[#E7E7E7] shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <div>
                <h3 className="font-display font-bold text-xl text-[#111827]">Bulk Import Students via Excel</h3>
                <p className="text-xs text-[#6B7280]">Supports rich 18-column recommended format & legacy sheets.</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-[#6B7280] hover:text-[#111827]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Template Download Banner */}
            <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#12B76A]/30 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs font-extrabold text-[#065F46] block">📥 Download Recommended Excel Template</span>
                <span className="text-[11px] text-[#047857]">Pre-formatted with 18 required & optional student fields</span>
              </div>
              <button
                type="button"
                onClick={downloadRecommendedExcelTemplate}
                className="px-4 py-2 rounded-full bg-[#12B76A] hover:bg-[#0D9488] text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Get Template (.xlsx)</span>
              </button>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div className="p-8 border-2 border-dashed border-[#E7E7E7] hover:border-[#12B76A] rounded-2xl bg-[#FAFAFA] transition-colors text-center space-y-3">
              <Upload className="w-10 h-10 text-[#12B76A] mx-auto animate-bounce" />
              <p className="text-xs text-[#111827] font-bold">Select or Drag Excel / CSV File (.xlsx / .csv)</p>
              <p className="text-[10px] text-[#6B7280] max-w-sm mx-auto">
                Required: Register No*, Student Name*, Department*, Year*, Semester*, Section*, Class Portal ID*. Auto-links students to portal containers.
              </p>
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileUpload}
                className="block w-full text-xs text-[#6B7280] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[#ECFDF5] file:text-[#12B76A]"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-mono space-y-1">
              <p className="font-bold text-slate-800">⚡ Automated Import Rules:</p>
              <p>• <strong>Upsert:</strong> If Register No. exists, updates information cleanly.</p>
              <p>• <strong>Portal Linking:</strong> Linked directly to specified Class Portal container (e.g. AI3C).</p>
              <p>• <strong>Security:</strong> Default passwords are bcrypt hashed and require first-login change.</p>
              <p>• <strong>Supabase Sync:</strong> Records synced simultaneously to Supabase Cloud & SQLite.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;
