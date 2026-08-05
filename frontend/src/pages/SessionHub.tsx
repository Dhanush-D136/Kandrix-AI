import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { AttendanceSession, TimetableItem } from '../types';
import { DynamicQRDisplay } from '../components/DynamicQRDisplay';
import { HeroBanner } from '../components/HeroBanner';
import * as XLSX from 'xlsx';
import {
  QrCode,
  Play,
  StopCircle,
  Sparkles,
  Clock,
  CheckCircle2,
  UserX,
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  X,
  Filter,
  Users,
  Calendar,
  UserCheck,
  ShieldCheck,
  Zap,
  ArrowUpRight
} from 'lucide-react';

interface SessionHubProps {
  initialSubject?: string;
  initialFaculty?: string;
  initialSubjectCode?: string;
  initialPeriod?: string;
}

export const SessionHub: React.FC<SessionHubProps> = ({
  initialSubject,
  initialFaculty,
  initialSubjectCode,
  initialPeriod
}) => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const selectedSessionRef = useRef<AttendanceSession | null>(null);

  const [timetables, setTimetables] = useState<TimetableItem[]>([]);
  const [assignedFacultySubjects, setAssignedFacultySubjects] = useState<any[]>([]);

  // Roster state
  const [presentStudents, setPresentStudents] = useState<any[]>([]);
  const [absentStudents, setAbsentStudents] = useState<any[]>([]);
  const [totalEnrolled, setTotalEnrolled] = useState<number>(0);
  const [attendanceRate, setAttendanceRate] = useState<string>('0.00');
  const [rosterTab, setRosterTab] = useState<'present' | 'absent'>('present');

  // Analyze Session Modal state
  const [showAnalysisModal, setShowAnalysisModal] = useState<boolean>(false);
  const [analysisFilter, setAnalysisFilter] = useState<'all' | 'present' | 'absent' | 'late'>('all');

  // Selected Timetable Slot for QR Generation
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('');
  const [subject, setSubject] = useState<string>(initialSubject || 'Programming Language for AI');
  const [facultyName, setFacultyName] = useState<string>(initialFaculty || 'Mrs Nivetha P');
  const [periodNumber, setPeriodNumber] = useState<string>(initialPeriod || '1');
  const [subjectCode, setSubjectCode] = useState<string>(initialSubjectCode || '');
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [department, setDepartment] = useState('AI & Data Science');
  const [year, setYear] = useState('3');
  const [section, setSection] = useState('A');
  const [duration, setDuration] = useState('30');

  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    selectedSessionRef.current = selectedSession;
  }, [selectedSession]);

  // Sync initial props when passed dynamically
  useEffect(() => {
    if (initialSubject) setSubject(initialSubject);
    if (initialFaculty) setFacultyName(initialFaculty);
    if (initialSubjectCode) setSubjectCode(initialSubjectCode);
    if (initialPeriod) setPeriodNumber(initialPeriod);
  }, [initialSubject, initialFaculty, initialSubjectCode, initialPeriod]);

  useEffect(() => {
    if (user && user.role === 'faculty') {
      api.get(`/faculty/dashboard?faculty_id=${user.id}`)
        .then((res) => {
          const subs = res.data.assignedSubjects || [];
          setAssignedFacultySubjects(subs);
          if (subs.length > 0 && !initialSubject) {
            const firstSub = subs[0].subject_name || subs[0].name;
            const firstCode = subs[0].subject_code || subs[0].code || '';
            setSubject(firstSub);
            setSubjectCode(firstCode);
          }
          if (res.data.faculty && res.data.faculty.name) {
            setFacultyName(res.data.faculty.name);
          }
        })
        .catch((err) => console.error('Error fetching faculty assigned subjects:', err));
    }
  }, [user]);

  const fetchTimetables = async () => {
    try {
      const res = await api.get('/timetables');
      const fetchedTt = res.data.timetables || [];
      setTimetables(fetchedTt);

      if (initialSubject) {
        const match = fetchedTt.find(
          (t: TimetableItem) =>
            t.subject_name.toLowerCase().includes(initialSubject.toLowerCase()) ||
            initialSubject.toLowerCase().includes(t.subject_name.toLowerCase())
        );
        if (match) {
          setSelectedTimetableId(match.id);
          setSubject(match.subject_name);
          setFacultyName(match.faculty_name);
          setPeriodNumber(String(match.period_number || 1));
          if (match.department) setDepartment(match.department);
          if (match.section) setSection(match.section);
          if (match.year) setYear(String(match.year));
        } else {
          setSubject(initialSubject);
          if (initialFaculty) setFacultyName(initialFaculty);
        }
      } else {
        // Auto-detect current active or upcoming timetable slot
        try {
          const slotRes = await api.get('/sessions/current-slot');
          const activeOrNext = slotRes.data?.slot || slotRes.data?.nextSlot;
          if (activeOrNext) {
            if (activeOrNext.id) setSelectedTimetableId(activeOrNext.id);
            if (activeOrNext.subject_name || activeOrNext.subject) setSubject(activeOrNext.subject_name || activeOrNext.subject);
            if (activeOrNext.faculty_name || activeOrNext.faculty) setFacultyName(activeOrNext.faculty_name || activeOrNext.faculty);
            if (activeOrNext.period_number || activeOrNext.periodNumber) setPeriodNumber(String(activeOrNext.period_number || activeOrNext.periodNumber));
            if (activeOrNext.department) setDepartment(activeOrNext.department);
            if (activeOrNext.section) setSection(activeOrNext.section);
            if (activeOrNext.year) setYear(String(activeOrNext.year));
          } else if (fetchedTt.length > 0) {
            const first = fetchedTt[0];
            setSelectedTimetableId(first.id);
            setSubject(first.subject_name);
            setFacultyName(first.faculty_name);
            setPeriodNumber(String(first.period_number || 1));
          }
        } catch (e) {
          if (fetchedTt.length > 0) {
            const first = fetchedTt[0];
            setSelectedTimetableId(first.id);
            setSubject(first.subject_name);
            setFacultyName(first.faculty_name);
            setPeriodNumber(String(first.period_number || 1));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch timetables:', err);
    }
  };

  const fetchSessions = async () => {
    try {
      const res = await api.get('/sessions');
      const fetchedSessions = res.data.sessions || [];
      setSessions(fetchedSessions);

      if (fetchedSessions.length > 0 && !selectedSessionRef.current) {
        let targetSession = null;
        if (initialSubject) {
          targetSession = fetchedSessions.find(
            (s: AttendanceSession) =>
              s.status === 'active' &&
              (s.subject.toLowerCase().includes(initialSubject.toLowerCase()) ||
                initialSubject.toLowerCase().includes(s.subject.toLowerCase()))
          );
        }
        if (!targetSession) {
          targetSession = fetchedSessions.find((s: AttendanceSession) => s.status === 'active') || fetchedSessions[0];
        }
        if (targetSession) {
          selectSession(targetSession);
        }
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    }
  };

  const selectSession = async (session: AttendanceSession) => {
    setSelectedSession(session);
    try {
      const res = await api.get(`/sessions/${session.id}`);
      const presents = res.data.presentStudents || [];
      const absents = res.data.absentStudents || [];
      const enrolled = res.data.totalEnrolled || (presents.length + absents.length);
      const rate = res.data.attendanceRate || (enrolled > 0 ? ((presents.length / enrolled) * 100).toFixed(2) : '0.00');

      setPresentStudents(presents);
      setAbsentStudents(absents);
      setTotalEnrolled(enrolled);
      setAttendanceRate(rate);
    } catch (e) {
      setPresentStudents([]);
      setAbsentStudents([]);
      setTotalEnrolled(0);
      setAttendanceRate('0.00');
    }
  };

  useEffect(() => {
    fetchTimetables();
    fetchSessions();

    const socket = getSocket();
    const handleUpdate = () => {
      fetchSessions();
      if (selectedSessionRef.current) {
        selectSession(selectedSessionRef.current);
      }
    };

    const handleTimetableSync = () => {
      console.log('⚡ [QR SESSION HUB] Real-time timetable change detected. Refetching active slot & timetable list...');
      fetchTimetables();
    };

    socket.on('attendance_updated', handleUpdate);
    socket.on('attendance_marked', handleUpdate);
    socket.on('attendanceMarked', handleUpdate);
    socket.on('new_attendance_record', handleUpdate);
    socket.on('session_updated', handleUpdate);

    socket.on('timetable_created', handleTimetableSync);
    socket.on('timetable_updated', handleTimetableSync);
    socket.on('timetable_deleted', handleTimetableSync);
    socket.on('timetable_changed', handleTimetableSync);

    return () => {
      socket.off('attendance_updated', handleUpdate);
      socket.off('attendance_marked', handleUpdate);
      socket.off('attendanceMarked', handleUpdate);
      socket.off('new_attendance_record', handleUpdate);
      socket.off('session_updated', handleUpdate);

      socket.off('timetable_created', handleTimetableSync);
      socket.off('timetable_updated', handleTimetableSync);
      socket.off('timetable_deleted', handleTimetableSync);
      socket.off('timetable_changed', handleTimetableSync);
    };
  }, []);

  // Handle Select Timetable Slot from Dropdown
  const handleTimetableSelect = (ttId: string) => {
    setSelectedTimetableId(ttId);
    const tt = timetables.find((t) => t.id === ttId);
    if (tt) {
      setSubject(tt.subject_name);
      setFacultyName(tt.faculty_name);
      setPeriodNumber(String(tt.period_number || 1));
      if (tt.department) setDepartment(tt.department);
      if (tt.section) setSection(tt.section);
    }
  };

  // Launch Session directly linked to Timetable Entry
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || subject.trim() === '') {
      alert('❌ Validation Error: Subject Name is required to generate a session QR code.');
      return;
    }
    if (!facultyName || facultyName.trim() === '') {
      alert('❌ Validation Error: Faculty assignment is required before generating session QR code.');
      return;
    }

    try {
      setIsCreating(true);
      const res = await api.post('/sessions', {
        subject: subject.trim(),
        subject_code: subjectCode.trim(),
        faculty_name: facultyName.trim(),
        period_number: periodNumber,
        date: sessionDate,
        department,
        year: parseInt(year),
        section,
        duration_minutes: parseInt(duration)
      });

      const newSession = res.data.session;
      setSessions((prev) => [newSession, ...prev]);
      selectSession(newSession);
      alert(`✅ Attendance Session launched exclusively for ${subject} (Period ${periodNumber})!`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to launch attendance session');
    } finally {
      setIsCreating(false);
    }
  };

  // Manually mark absent student as present
  const handleManualMarkPresent = async (studentId: string, studentName: string) => {
    if (!selectedSession) return;
    try {
      await api.post('/attendance/admin-mark', {
        student_id: studentId,
        session_id: selectedSession.id,
        status: 'present',
        notes: 'Marked present by faculty'
      });
      alert(`✅ Marked ${studentName} as PRESENT`);
      selectSession(selectedSession);
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to mark attendance'}`);
    }
  };

  // Manually mark present student as absent
  const handleManualMarkAbsent = async (recordId: string, studentName: string) => {
    if (!recordId) return;
    if (!confirm(`Mark ${studentName} as ABSENT for this session?`)) return;
    try {
      await api.delete(`/attendance/records/${recordId}`);
      alert(`✅ Updated ${studentName} to ABSENT`);
      if (selectedSession) selectSession(selectedSession);
    } catch (err: any) {
      alert(`❌ ${err.response?.data?.error || 'Failed to update attendance'}`);
    }
  };

  const handleEndSession = async (sessionId: string) => {
    if (!confirm('End and close this attendance session? Students will no longer be able to scan.')) return;
    try {
      await api.post(`/sessions/${sessionId}/end`);
      if (selectedSession && selectedSession.id === sessionId) {
        setSelectedSession((prev: any) => (prev ? { ...prev, status: 'completed' } : null));
      }
      fetchSessions();
      alert('✅ Attendance Session closed successfully.');
    } catch (err: any) {
      console.error('Failed to end session:', err);
      alert(`❌ ${err.response?.data?.error || err.message || 'Failed to end session'}`);
    }
  };

  // Calculate Late Entries (scanned > 5 minutes after session start)
  const getLateEntries = () => {
    if (!selectedSession?.start_time) return [];
    const startTime = new Date(selectedSession.start_time).getTime();
    return presentStudents.filter((st) => {
      if (!st.attendance_time) return false;
      const scanTime = new Date(st.attendance_time).getTime();
      return scanTime - startTime > 5 * 60 * 1000;
    });
  };

  const lateStudents = getLateEntries();

  // Filtered Students for Analysis Modal
  const getFilteredAnalysisList = () => {
    if (analysisFilter === 'present') {
      return presentStudents.map((s) => ({ ...s, status: 'Present', scan_method: 'QR Scan' }));
    }
    if (analysisFilter === 'absent') {
      return absentStudents.map((s) => ({ ...s, status: 'Absent', scan_method: 'N/A' }));
    }
    if (analysisFilter === 'late') {
      return lateStudents.map((s) => ({ ...s, status: 'Present (Late)', scan_method: 'QR Scan' }));
    }
    return [
      ...presentStudents.map((s) => ({ ...s, status: 'Present', scan_method: 'QR Scan' })),
      ...absentStudents.map((s) => ({ ...s, status: 'Absent', scan_method: 'N/A' }))
    ];
  };

  // Export to Excel (.xlsx)
  const exportExcel = () => {
    if (!selectedSession) return;
    const dataList = getFilteredAnalysisList().map((st) => ({
      'Register Number': st.roll_number,
      'Student Name': st.name,
      Department: st.department || selectedSession.department || 'AI & DS',
      'Time Marked': st.attendance_time ? new Date(st.attendance_time).toLocaleTimeString() : 'N/A',
      Status: st.status,
      'Scan Method': st.scan_method || 'QR Scan'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataList);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Roster');
    XLSX.writeFile(workbook, `Session_Roster_${selectedSession.subject.replace(/[^a-zA-Z0-9]/g, '_')}_P${selectedSession.period_number || 1}.xlsx`);
  };

  // Export to CSV (.csv)
  const exportCSV = () => {
    if (!selectedSession) return;
    const list = getFilteredAnalysisList();
    let csvContent = 'Register Number,Student Name,Department,Time Marked,Status,Scan Method\n';
    list.forEach((st) => {
      const time = st.attendance_time ? new Date(st.attendance_time).toLocaleTimeString() : 'N/A';
      csvContent += `"${st.roll_number}","${st.name}","${st.department || selectedSession.department || 'AI & DS'}","${time}","${st.status}","${st.scan_method || 'QR Scan'}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Session_Roster_${selectedSession.subject.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to Printable PDF Layout
  const exportPDF = () => {
    if (!selectedSession) return;
    const list = getFilteredAnalysisList();
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to generate PDF report.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Session Attendance Analysis - ${selectedSession.subject}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #111827; }
          .header { border-bottom: 2px solid #6D5DFC; padding-bottom: 15px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: 800; color: #111827; margin: 0; }
          .subtitle { font-size: 13px; color: #6B7280; margin-top: 5px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
          .card { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px; rounded: 12px; }
          .card-title { font-size: 10px; text-transform: uppercase; color: #64748B; font-weight: 700; }
          .card-val { font-size: 20px; font-weight: 800; color: #111827; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th, td { border: 1px solid #E2E8F0; padding: 8px 12px; text-align: left; }
          th { background: #F1F5F9; font-weight: 700; color: #334155; }
          .badge-present { background: #DCFCE7; color: #15803D; padding: 3px 8px; border-radius: 999px; font-weight: 700; font-size: 10px; }
          .badge-absent { background: #FEE2E2; color: #B91C1C; padding: 3px 8px; border-radius: 999px; font-weight: 700; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">KANDRIX AI ATTENDANCE SYSTEM</h1>
          <p class="subtitle">Session Roster & Attendance Analysis Report</p>
        </div>

        <div style="margin-bottom: 20px; font-size: 13px; line-height: 1.6;">
          <strong>Subject:</strong> ${selectedSession.subject}<br>
          <strong>Faculty:</strong> ${selectedSession.faculty_name || 'Faculty Member'}<br>
          <strong>Period:</strong> P${selectedSession.period_number || 1} &bull; <strong>Date:</strong> ${selectedSession.date || sessionDate}<br>
          <strong>Department:</strong> ${selectedSession.department || 'AI & DS'} (Sec ${selectedSession.section || 'A'})
        </div>

        <div class="grid">
          <div class="card"><div class="card-title">Total Strength</div><div class="card-val">${totalEnrolled}</div></div>
          <div class="card"><div class="card-title">Present</div><div class="card-val" style="color:#12B76A">${presentStudents.length}</div></div>
          <div class="card"><div class="card-title">Absent</div><div class="card-val" style="color:#E11D48">${absentStudents.length}</div></div>
          <div class="card"><div class="card-title">Attendance Rate</div><div class="card-val" style="color:#6D5DFC">${attendanceRate}%</div></div>
        </div>

        <h3>Student Attendance Roster (${analysisFilter.toUpperCase()})</h3>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Register Number</th>
              <th>Student Name</th>
              <th>Department</th>
              <th>Time Marked</th>
              <th>Status</th>
              <th>Scan Method</th>
            </tr>
          </thead>
          <tbody>
            ${list.map((st, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td style="font-family: monospace; font-weight: bold;">${st.roll_number}</td>
                <td style="font-weight: bold;">${st.name}</td>
                <td>${st.department || selectedSession.department || 'AI & DS'}</td>
                <td style="font-family: monospace;">${st.attendance_time ? new Date(st.attendance_time).toLocaleTimeString() : 'N/A'}</td>
                <td><span class="${st.status.includes('Present') ? 'badge-present' : 'badge-absent'}">${st.status}</span></td>
                <td>${st.scan_method || (st.status.includes('Present') ? 'QR Scan' : 'N/A')}</td>
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

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      {/* Hero Cover Banner */}
      <HeroBanner />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-[#111827]">Live Dynamic QR Attendance Hub</h1>
          <p className="text-xs text-[#6B7280] font-medium mt-1">
            Real-time attendance session manager for KANDRIX AI Attendance System
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Timetable Selection & Launch Form */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
            <div className="flex items-center gap-2 text-[#6D5DFC]">
              <Play className="w-4 h-4 fill-[#6D5DFC]" />
              <h3 className="font-display font-bold text-base text-[#111827]">Launch Timetable QR Session</h3>
            </div>

            <form onSubmit={handleCreateSession} className="space-y-3">
              {/* Timetable Slot Selector */}
              {timetables.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Select Timetable Entry</label>
                  <select
                    value={selectedTimetableId}
                    onChange={(e) => handleTimetableSelect(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/30 text-[#6D5DFC] text-xs font-bold"
                  >
                    {timetables.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.day} P{t.period_number || 1} - {t.subject_name} ({t.faculty_name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">
                  Subject Name * {user?.role === 'faculty' && <span className="text-[10px] text-[#6D5DFC] font-bold">(Assigned Only)</span>}
                </label>
                {user?.role === 'faculty' && assignedFacultySubjects.length > 0 ? (
                  <select
                    required
                    value={subject}
                    onChange={(e) => {
                      const selected = assignedFacultySubjects.find(
                        (s) => (s.subject_name || s.name) === e.target.value
                      );
                      setSubject(e.target.value);
                      if (selected) {
                        setSubjectCode(selected.subject_code || selected.code || '');
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/40 text-[#111827] text-xs font-bold"
                  >
                    {assignedFacultySubjects.map((sub, i) => (
                      <option key={i} value={sub.subject_name || sub.name}>
                        {sub.subject_name || sub.name} ({sub.subject_code || sub.code || 'CODE'})
                      </option>
                    ))}
                  </select>
                ) : user?.role === 'faculty' ? (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold">
                    ⚠️ No subjects assigned by Admin yet. You cannot generate QR for unassigned subjects.
                  </div>
                ) : (
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] text-xs font-medium"
                  />
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#111827] mb-1">Faculty Name *</label>
                <input
                  type="text"
                  required
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={sessionDate}
                    onChange={(e) => setSessionDate(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Duration</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] text-xs font-medium"
                  >
                    <option value="15">15 Mins</option>
                    <option value="25">25 Mins</option>
                    <option value="45">45 Mins</option>
                    <option value="60">60 Mins</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Period Number</label>
                  <select
                    value={periodNumber}
                    onChange={(e) => setPeriodNumber(e.target.value)}
                    className="w-full px-2 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] text-xs"
                  >
                    <option value="1">Period 1</option>
                    <option value="2">Period 2</option>
                    <option value="3">Period 3</option>
                    <option value="4">Period 4</option>
                    <option value="5">Period 5</option>
                    <option value="6">Period 6</option>
                    <option value="7">Period 7</option>
                    <option value="8">Period 8</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#111827] mb-1">Section</label>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-2 py-2 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] text-[#111827] text-xs"
                  >
                    <option value="A">Sec A</option>
                    <option value="B">Sec B</option>
                    <option value="C">Sec C</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-3.5 rounded-full bg-[#6D5DFC] font-bold text-xs text-white shadow-floating hover:bg-[#5b4be0] transition-all flex items-center justify-center gap-2 mt-2"
              >
                {isCreating ? (
                  <span>Generating QR...</span>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-white" />
                    <span>Generate Session QR</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Session History List */}
          <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-3">
            <h3 className="font-display font-bold text-sm text-[#111827]">Active & Past Sessions</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {sessions.length === 0 ? (
                <p className="text-xs text-[#6B7280] py-4 text-center">No attendance sessions created yet.</p>
              ) : (
                sessions.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => selectSession(s)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-xs space-y-1 ${
                      selectedSession?.id === s.id
                        ? 'bg-[#F3F0FF] border-[#6D5DFC]/40 text-[#111827]'
                        : 'bg-[#FAFAFA] border-[#E7E7E7] text-[#6B7280] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="text-[#111827]">{s.subject}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold ${
                        s.status === 'active' ? 'bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20' : 'bg-[#E7E7E7] text-[#6B7280]'
                      }`}>
                        {s.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#6B7280] font-medium">
                      <span>Code: <strong className="text-[#6D5DFC] font-mono font-bold">{s.attendance_code}</strong></span>
                      <span>P{s.period_number || 1} • {new Date(s.start_time).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic QR Display & Present/Absent Rosters */}
        <div className="space-y-6 lg:col-span-2">
          {selectedSession && selectedSession.status === 'active' ? (
            <div className="space-y-6">
              <DynamicQRDisplay
                sessionId={selectedSession.id}
                subjectName={selectedSession.subject}
                subjectCode={subjectCode || (selectedSession as any).subject_code}
                facultyName={selectedSession.faculty_name}
                periodNumber={selectedSession.period_number}
                sessionDate={selectedSession.date || sessionDate}
                department={selectedSession.department}
                section={selectedSession.section}
                liveRecordsCount={presentStudents.length}
              />

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowAnalysisModal(true)}
                  className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#6D5DFC] to-[#4F7CFF] text-white text-xs font-extrabold shadow-floating hover:from-[#5b4be0] hover:to-[#3b68ee] transition-all flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4 text-white" />
                  <span>Analyze Session</span>
                </button>

                <button
                  onClick={() => handleEndSession(selectedSession.id)}
                  className="px-5 py-2.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-100 transition-all inline-flex items-center gap-2 shadow-sm"
                >
                  <StopCircle className="w-4 h-4 text-rose-600" />
                  <span>End Session</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-10 rounded-[24px] border border-[#E7E7E7] shadow-enterprise text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/20 flex items-center justify-center mx-auto text-[#6D5DFC]">
                <QrCode className="w-7 h-7" />
              </div>
              <h3 className="font-display font-bold text-base text-[#111827]">No Active QR Session Displayed</h3>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto font-medium">
                Select a timetable slot from the left form to launch the 25-second dynamic attendance QR code.
              </p>
            </div>
          )}

          {/* SESSION ROSTER TABLE & CONTROLS */}
          {selectedSession && (
            <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E7E7]">
                <div>
                  <h3 className="font-display font-bold text-base text-[#111827]">
                    Session Roster — {selectedSession.subject}
                  </h3>
                  <p className="text-xs text-[#6B7280] font-medium">
                    Faculty: <strong>{selectedSession.faculty_name || 'Faculty Member'}</strong> • Period: P{selectedSession.period_number || 1}
                  </p>
                </div>

                {/* Right Side Action Badges & Analyze Button */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setRosterTab('present')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      rosterTab === 'present'
                        ? 'bg-[#12B76A] text-white shadow-floating'
                        : 'bg-[#FAFAFA] text-[#6B7280] border border-[#E7E7E7]'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Present ({presentStudents.length})
                  </button>

                  <button
                    onClick={() => setRosterTab('absent')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                      rosterTab === 'absent'
                        ? 'bg-rose-600 text-white shadow-floating'
                        : 'bg-[#FAFAFA] text-[#6B7280] border border-[#E7E7E7]'
                    }`}
                  >
                    <UserX className="w-3.5 h-3.5" /> Absent ({absentStudents.length})
                  </button>

                  <button
                    onClick={() => setShowAnalysisModal(true)}
                    className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#6D5DFC] to-[#4F7CFF] text-white text-xs font-extrabold shadow-sm hover:from-[#5b4be0] hover:to-[#3b68ee] transition-all flex items-center gap-1.5"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Analyze Session</span>
                  </button>
                </div>
              </div>

              {/* PRESENT STUDENTS ROSTER TABLE */}
              {rosterTab === 'present' && (
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] font-bold">
                      <tr>
                        <th className="pb-3">Student Name</th>
                        <th className="pb-3">Register Number</th>
                        <th className="pb-3">Department</th>
                        <th className="pb-3">Time Marked</th>
                        <th className="pb-3">Attendance Status</th>
                        <th className="pb-3">Scan Method</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E7E7]">
                      {presentStudents.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-[#6B7280]">
                            No students marked present yet for this session.
                          </td>
                        </tr>
                      ) : (
                        presentStudents.map((st) => (
                          <tr key={st.id || st.record_id} className="hover:bg-[#FAFAFA] transition-colors">
                            <td className="py-3 font-bold text-[#111827] flex items-center gap-2">
                              <img
                                src={st.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                alt=""
                                className="w-7 h-7 rounded-full object-cover border border-[#E7E7E7]"
                              />
                              <span>{st.name}</span>
                            </td>
                            <td className="py-3 font-mono text-[#6D5DFC] font-bold">{st.roll_number}</td>
                            <td className="py-3 text-[#6B7280] font-medium">{st.department || selectedSession.department || 'AI & DS'}</td>
                            <td className="py-3 font-mono text-[#12B76A] font-bold">
                              {st.attendance_time ? new Date(st.attendance_time).toLocaleTimeString() : 'Verified'}
                            </td>
                            <td className="py-3">
                              <span className="px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#12B76A]/30 text-[#12B76A] font-extrabold text-[10px] inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Present
                              </span>
                            </td>
                            <td className="py-3">
                              <span className="px-2.5 py-1 rounded-full bg-[#F3F0FF] border border-[#6D5DFC]/30 text-[#6D5DFC] font-mono font-extrabold text-[10px] inline-flex items-center gap-1">
                                <QrCode className="w-3 h-3" /> QR Scan
                              </span>
                            </td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleManualMarkAbsent(st.record_id, st.name)}
                                className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-[10px] font-bold text-rose-600 hover:bg-rose-100 transition-colors"
                              >
                                Mark Absent
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ABSENT STUDENTS ROSTER TABLE */}
              {rosterTab === 'absent' && (
                <div className="overflow-x-auto max-h-72">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] font-bold">
                      <tr>
                        <th className="pb-3">Student Name</th>
                        <th className="pb-3">Register Number</th>
                        <th className="pb-3">Department</th>
                        <th className="pb-3">Attendance Status</th>
                        <th className="pb-3">Scan Method</th>
                        <th className="pb-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E7E7E7]">
                      {absentStudents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-[#12B76A] font-bold">
                            🎉 All enrolled students are marked Present for this session!
                          </td>
                        </tr>
                      ) : (
                        absentStudents.map((st) => (
                          <tr key={st.id} className="hover:bg-rose-50/40 transition-colors">
                            <td className="py-3 font-bold text-[#111827] flex items-center gap-2">
                              <img
                                src={st.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                                alt=""
                                className="w-7 h-7 rounded-full object-cover border border-[#E7E7E7]"
                              />
                              <span>{st.name}</span>
                            </td>
                            <td className="py-3 font-mono text-rose-600 font-bold">{st.roll_number}</td>
                            <td className="py-3 text-[#6B7280] font-medium">{st.department || selectedSession.department || 'AI & DS'}</td>
                            <td className="py-3">
                              <span className="px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-extrabold text-[10px] inline-flex items-center gap-1">
                                <UserX className="w-3 h-3" /> Absent
                              </span>
                            </td>
                            <td className="py-3 text-[#9CA3AF] text-[11px]">N/A</td>
                            <td className="py-3 text-right">
                              <button
                                onClick={() => handleManualMarkPresent(st.id, st.name)}
                                className="px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#12B76A]/20 text-[10px] font-bold text-[#12B76A] hover:bg-[#12B76A]/10 transition-colors"
                              >
                                Mark Present
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================================================== */}
      {/* ANALYZE SESSION PANEL MODAL */}
      {/* ================================================== */}
      {showAnalysisModal && selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[32px] p-6 sm:p-8 overflow-y-auto border border-[#E7E7E7] shadow-2xl space-y-6 animate-fade-in relative">
            
            {/* Modal Header Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E7E7E7]">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#6D5DFC] to-[#4F7CFF] text-white flex items-center justify-center shadow-md">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-display font-extrabold text-xl text-[#111827]">
                    Session Roster Analysis & Summary
                  </h2>
                  <p className="text-xs text-[#6B7280] font-medium">
                    Detailed analytics breakdown for {selectedSession.subject}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAnalysisModal(false)}
                className="w-9 h-9 rounded-full bg-[#F3F0FF] text-[#6D5DFC] hover:bg-[#6D5DFC] hover:text-white transition-all flex items-center justify-center font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* SESSION SUMMARY METRICS GRID */}
            <div className="bg-[#FAF9FF] p-5 rounded-2xl border border-[#6D5DFC]/20 space-y-4">
              <h4 className="text-xs font-bold text-[#6D5DFC] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Session Summary
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-white p-3.5 rounded-2xl border border-[#E7E7E7] shadow-sm">
                  <span className="text-[10px] text-[#6B7280] font-bold uppercase tracking-wider block">Total Students</span>
                  <span className="font-display font-extrabold text-2xl text-[#111827] block mt-1">{totalEnrolled}</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-[#ECFDF5] shadow-sm">
                  <span className="text-[10px] text-[#12B76A] font-bold uppercase tracking-wider block">Present</span>
                  <span className="font-display font-extrabold text-2xl text-[#12B76A] block mt-1">{presentStudents.length}</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-rose-100 shadow-sm">
                  <span className="text-[10px] text-rose-600 font-bold uppercase tracking-wider block">Absent</span>
                  <span className="font-display font-extrabold text-2xl text-rose-600 block mt-1">{absentStudents.length}</span>
                </div>
                <div className="bg-white p-3.5 rounded-2xl border border-[#6D5DFC]/20 shadow-sm">
                  <span className="text-[10px] text-[#6D5DFC] font-bold uppercase tracking-wider block">Attendance Rate</span>
                  <span className="font-display font-extrabold text-2xl text-[#6D5DFC] block mt-1">{attendanceRate}%</span>
                </div>
              </div>

              {/* Session Details Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#E7E7E7] text-xs text-[#111827]">
                <div>
                  <span className="text-[10px] text-[#6B7280] font-bold block uppercase">Subject</span>
                  <strong className="font-bold">{selectedSession.subject}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7280] font-bold block uppercase">Faculty</span>
                  <strong className="font-bold">{selectedSession.faculty_name || 'Mrs Nivetha P'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7280] font-bold block uppercase">Period & Date</span>
                  <strong className="font-bold">P{selectedSession.period_number || 1} • {selectedSession.date || sessionDate}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#6B7280] font-bold block uppercase">Department & Sec</span>
                  <strong className="font-bold">{selectedSession.department || 'AI & DS'} (Sec {selectedSession.section || 'A'})</strong>
                </div>
              </div>
            </div>

            {/* FILTERS & EXPORT ACTIONS BAR */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1.5 bg-[#F8FAFC] p-1.5 rounded-2xl border border-[#E2E8F0] text-xs font-bold">
                <button
                  onClick={() => setAnalysisFilter('all')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all ${
                    analysisFilter === 'all'
                      ? 'bg-[#111827] text-white shadow-sm'
                      : 'text-[#64748B] hover:text-[#111827]'
                  }`}
                >
                  Show All ({totalEnrolled})
                </button>
                <button
                  onClick={() => setAnalysisFilter('present')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all ${
                    analysisFilter === 'present'
                      ? 'bg-[#12B76A] text-white shadow-sm'
                      : 'text-[#64748B] hover:text-[#111827]'
                  }`}
                >
                  Present Only ({presentStudents.length})
                </button>
                <button
                  onClick={() => setAnalysisFilter('absent')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all ${
                    analysisFilter === 'absent'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-[#64748B] hover:text-[#111827]'
                  }`}
                >
                  Absent Only ({absentStudents.length})
                </button>
                <button
                  onClick={() => setAnalysisFilter('late')}
                  className={`px-3.5 py-1.5 rounded-xl transition-all ${
                    analysisFilter === 'late'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-[#64748B] hover:text-[#111827]'
                  }`}
                >
                  Late Entries ({lateStudents.length})
                </button>
              </div>

              {/* Export Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={exportPDF}
                  className="px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#111827] hover:bg-[#F8FAFC] text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>Export PDF</span>
                </button>
                <button
                  onClick={exportExcel}
                  className="px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#111827] hover:bg-[#F8FAFC] text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#12B76A]" />
                  <span>Export Excel</span>
                </button>
                <button
                  onClick={exportCSV}
                  className="px-3.5 py-2 rounded-xl bg-white border border-[#E2E8F0] text-[#111827] hover:bg-[#F8FAFC] text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-4 h-4 text-[#6D5DFC]" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>

            {/* ROSTER ANALYSIS TABLE */}
            <div className="overflow-x-auto border border-[#E7E7E7] rounded-2xl max-h-80">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] border-b border-[#E7E7E7] text-[#64748B] uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Register Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Department & Section</th>
                    <th className="py-3 px-4">Time Marked</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Scan Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E7E7]">
                  {getFilteredAnalysisList().length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-[#6B7280] font-medium">
                        No student records match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    getFilteredAnalysisList().map((st, idx) => (
                      <tr key={st.id || idx} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#6D5DFC]">{st.roll_number}</td>
                        <td className="py-3 px-4 font-bold text-[#111827] flex items-center gap-2">
                          <img
                            src={st.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-[#E7E7E7]"
                          />
                          <span>{st.name}</span>
                        </td>
                        <td className="py-3 px-4 text-[#6B7280] font-medium">
                          {st.department || selectedSession.department || 'AI & DS'} III-{st.section || 'A'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#111827] font-bold">
                          {st.attendance_time ? new Date(st.attendance_time).toLocaleTimeString() : 'N/A'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] inline-flex items-center gap-1 ${
                              st.status.includes('Present')
                                ? 'bg-[#ECFDF5] border border-[#12B76A]/30 text-[#12B76A]'
                                : 'bg-rose-50 border border-rose-200 text-rose-700'
                            }`}
                          >
                            {st.status.includes('Present') ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <UserX className="w-3 h-3" />
                            )}
                            {st.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-full bg-[#F3F0FF] border border-[#6D5DFC]/20 text-[#6D5DFC] font-mono text-[10px] font-bold">
                            {st.scan_method || (st.status.includes('Present') ? 'QR Scan' : 'N/A')}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAnalysisModal(false)}
                className="px-6 py-2.5 rounded-full bg-[#111827] text-white font-bold text-xs hover:bg-black transition-all"
              >
                Close Summary
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default SessionHub;
