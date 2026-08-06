import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { AttendanceRecord, TimetableItem, SubjectItem } from '../types';
import { MapPin, ShieldCheck, History, Flame, CheckCircle2, XCircle, Award, Sparkles, BookOpen, Calendar, Clock, AlertTriangle, Bell, Calculator, TrendingUp, BarChart3, Zap } from 'lucide-react';
import { spellAttendanceService, StudentSpellAttendanceData } from '../services/spellAttendanceService';

import { HeroBanner } from '../components/HeroBanner';

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [timetables, setTimetables] = useState<TimetableItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [spellData, setSpellData] = useState<StudentSpellAttendanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [resHistory, resTimetables, resSubjects, resSpell] = await Promise.all([
        api.get('/attendance/my-history'),
        api.get('/timetable/student'),
        api.get('/subjects'),
        spellAttendanceService.getStudentSpellAttendance()
      ]);
      setHistory(resHistory.data.history || []);
      setTimetables(resTimetables.data.timetables || []);
      setSubjects(resSubjects.data.subjects || []);
      setSpellData(resSpell);
    } catch (err) {
      console.error('Failed to load student dashboard data', err);
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    fetchData();

    const socket = getSocket();
    const handleAttendanceMarked = (data: any) => {
      const rec = data?.record || data;
      if (rec && (rec.student_id === user?.id || !rec.student_id)) {
        setHistory((prev) => {
          if (prev.some((r) => r.id === rec.id)) return prev;
          return [rec, ...prev];
        });
        fetchData();
      }
    };

    const handleTimetableChanged = () => {
      console.log('⚡ [STUDENT DASHBOARD] Realtime timetable sync update received.');
      fetchData();
    };

    socket.on('attendanceMarked', handleAttendanceMarked);
    socket.on('attendance_marked', handleAttendanceMarked);
    socket.on('attendance_updated', handleAttendanceMarked);
    socket.on('timetable_created', handleTimetableChanged);
    socket.on('timetable_updated', handleTimetableChanged);
    socket.on('timetable_deleted', handleTimetableChanged);
    socket.on('timetable_changed', handleTimetableChanged);

    return () => {
      socket.off('attendanceMarked', handleAttendanceMarked);
      socket.off('attendance_marked', handleAttendanceMarked);
      socket.off('attendance_updated', handleAttendanceMarked);
      socket.off('timetable_created', handleTimetableChanged);
      socket.off('timetable_updated', handleTimetableChanged);
      socket.off('timetable_deleted', handleTimetableChanged);
      socket.off('timetable_changed', handleTimetableChanged);
    };
  }, [user?.id]);

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = daysOfWeek[new Date().getDay()];

  const dayOrderMap: Record<string, string> = {
    'Monday': 'Monday • Day Order 1',
    'Tuesday': 'Tuesday • Day Order 2',
    'Wednesday': 'Wednesday • Day Order 3',
    'Thursday': 'Thursday • Day Order 4',
    'Friday': 'Friday • Day Order 5',
    'Saturday': 'Saturday • Off Day',
    'Sunday': 'Sunday • Off Day'
  };
  const todayDayOrderLabel = dayOrderMap[todayName] || todayName;

  // Helper to format date string to YYYY-MM-DD
  const getLocalDateStr = (val?: string | Date) => {
    if (!val) {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dayNum = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dayNum}`;
    }
    if (typeof val === 'string') {
      if (val.includes('T')) return val.split('T')[0];
      if (val.includes(' ')) return val.split(' ')[0];
      return val;
    }
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const dayNum = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayNum}`;
  };

  const todayStr = getLocalDateStr();

  // Today's classes filtering from timetable
  const todaysClasses = timetables.filter((t) => (t.day || '').toLowerCase() === todayName.toLowerCase());
  const todaysClassesSorted = [...todaysClasses].sort((a, b) => (Number(a.period_number) || 0) - (Number(b.period_number) || 0));

  // 1. Scheduled periods today from timetable
  const todayScheduledPeriods = todaysClassesSorted.length;

  // 2. Distinct attended periods today (student_id + date + period_number)
  const todayAttendedPeriodSet = new Set<string>();
  history.forEach((h: any) => {
    const isPresent = h.status === 'present' || h.status === 'late';
    if (!isPresent) return;

    const recDate = getLocalDateStr(h.attendance_time || h.session_date || h.date);
    if (recDate === todayStr) {
      let pNum = h.period_number ? String(h.period_number) : null;
      if (!pNum && h.subject) {
        const matched = todaysClassesSorted.find(
          (c) => (c.subject_name || c.subject || '').toLowerCase() === (h.subject || '').toLowerCase()
        );
        if (matched && matched.period_number) {
          pNum = String(matched.period_number);
        }
      }
      const periodKey = pNum || h.session_id || h.id;
      todayAttendedPeriodSet.add(periodKey);
    }
  });

  const todayAttendedPeriods = todayAttendedPeriodSet.size;
  const todayMissedPeriods = Math.max(0, todayScheduledPeriods - todayAttendedPeriods);

  // Overall & Period-level attendance metrics
  const totalClasses = history.length;
  const presentClasses = todayAttendedPeriods;
  const missedClasses = todayMissedPeriods;

  const attendanceRate = spellData ? spellData.spellPercentage : (totalClasses > 0 ? Math.round((presentClasses / Math.max(1, todayScheduledPeriods)) * 100) : null);
  const isPresentToday = todayAttendedPeriods > 0;
  const streak = (spellData as any)?.activeStreak || (isPresentToday ? 1 : 0);

  // Recovery Calculator logic for overall attendance
  const requiredPct = 75;
  let classesNeededForRecovery = 0;
  if (totalClasses > 0 && attendanceRate !== null && attendanceRate < requiredPct) {
    classesNeededForRecovery = Math.max(0, Math.ceil(3 * todayScheduledPeriods - 4 * presentClasses));
  }

  // Defaulter classification
  let defaulterStatus = '--';
  let defaulterColor = 'bg-slate-50 text-[#12B76A] border-[#12B76A]/20';
  if (attendanceRate !== null) {
    if (attendanceRate >= 75) {
      defaulterStatus = 'Safe (>=75%)';
      defaulterColor = 'bg-[#ECFDF5] text-[#12B76A] border-[#12B76A]/20';
    } else if (attendanceRate >= 65) {
      defaulterStatus = 'Warning (65-74%)';
      defaulterColor = 'bg-amber-50 text-amber-700 border-amber-200';
    } else if (attendanceRate >= 50) {
      defaulterStatus = 'High Risk (50-64%)';
      defaulterColor = 'bg-orange-50 text-orange-700 border-orange-200';
    } else {
      defaulterStatus = 'Critical (<50%)';
      defaulterColor = 'bg-rose-50 text-rose-700 border-rose-200';
    }
  }

  // Parse time to minutes for active period calculation
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  const parseTime = (t: string) => {
    if (!t) return 0;
    const isPM = t.toUpperCase().includes('PM');
    const isAM = t.toUpperCase().includes('AM');
    const clean = t.replace(/AM|PM/i, '').trim();
    const parts = clean.split(':');
    let h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return h * 60 + m;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Banner Section */}
      <HeroBanner />

      {/* Student Profile Header Card */}
      <div className="bg-white p-6 lg:p-8 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={user?.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt=""
            className="w-16 h-16 rounded-full border-2 border-[#E7E7E7] object-cover shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-extrabold text-2xl text-[#111827]">{user?.name}</h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                isPresentToday
                  ? 'bg-[#ECFDF5] text-[#12B76A] border-[#12B76A]/20'
                  : 'bg-[#F3F0FF] text-[#6D5DFC] border-[#6D5DFC]/20'
              }`}>
                {isPresentToday ? '✓ PRESENT TODAY' : 'STUDENT PORTAL'}
              </span>
            </div>
            <p className="text-xs text-[#6B7280] font-medium mt-1">
              Roll No: <span className="font-mono text-[#6D5DFC] font-bold">{user?.roll_number}</span> • Dept of {user?.department || 'Computer Science'} (Year {user?.year || 3}, Sec {user?.section || 'A'})
            </p>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-2 rounded-full bg-[#ECFDF5] border border-[#12B76A]/20 text-xs text-[#12B76A] flex items-center gap-1.5 font-bold shadow-sm">
            <MapPin className="w-4 h-4 text-[#12B76A] animate-pulse" />
            <span>GPS Geofence Verified</span>
          </div>
          <div className={`px-3.5 py-2 rounded-full border text-xs font-bold shadow-sm ${defaulterColor}`}>
            <span>Status: {defaulterStatus}</span>
          </div>
          <div className="px-3.5 py-2 rounded-full bg-[#F3F0FF] border border-[#6D5DFC]/20 text-xs text-[#6D5DFC] flex items-center gap-2 font-bold shadow-sm">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>{streak} Day Streak</span>
          </div>
        </div>
      </div>

      {/* SPELL ATTENDANCE SYSTEM (CURRENT SPELL) CARD */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E7E7]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-[#6D5DFC] tracking-wider">Current Spell</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-extrabold text-[10px]">
                  {spellData?.activeSpell?.spell_name || 'Spell 1'}
                </span>
              </div>
              <h2 className="font-display font-extrabold text-lg text-[#111827]">
                {spellData?.activeSpell?.spell_name || 'Spell 1'} Attendance Summary
              </h2>
            </div>
          </div>

          <div className="text-xs font-bold text-[#6D5DFC] bg-[#F3F0FF] px-4 py-2 rounded-2xl border border-[#6D5DFC]/20 self-start sm:self-auto flex items-center gap-1.5 shadow-sm">
            <Clock className="w-3.5 h-3.5 text-[#6D5DFC]" />
            <span>{spellData?.dateRange?.fromDate || '--'} to {spellData?.dateRange?.toDate || '--'}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
            <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">Working Days</span>
            <h3 className="text-xl font-extrabold text-[#111827]">{spellData ? spellData.workingDays : 0} Days</h3>
            <p className="text-[10px] text-[#6B7280]">Scheduled Days</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#10B981]/20 space-y-1">
            <span className="text-[10px] font-bold text-[#059669] uppercase tracking-wider block">Present Days</span>
            <h3 className="text-xl font-extrabold text-[#059669]">{spellData ? spellData.presentDays : 0} Days</h3>
            <p className="text-[10px] text-[#059669]">Attended 1+ Periods</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FEF2F2] border border-[#EF4444]/20 space-y-1">
            <span className="text-[10px] font-bold text-[#DC2626] uppercase tracking-wider block">Absent Days</span>
            <h3 className="text-xl font-extrabold text-[#DC2626]">{spellData ? spellData.absentDays : 0} Days</h3>
            <p className="text-[10px] text-[#DC2626]">0 Periods Attended</p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Classes Missed</span>
            <h3 className="text-xl font-extrabold text-amber-700">{missedClasses} Sessions</h3>
            <p className="text-[10px] text-amber-600">Total Unattended</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/20 space-y-1">
            <span className="text-[10px] font-bold text-[#6D5DFC] uppercase tracking-wider block">Active Streak</span>
            <h3 className="text-xl font-extrabold text-[#6D5DFC] flex items-center gap-1">
              <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
              {streak} Days
            </h3>
            <p className="text-[10px] text-[#6D5DFC]">Consecutive</p>
          </div>

          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#6D5DFC] to-[#4F46E5] text-white space-y-1 shadow-md">
            <span className="text-[10px] font-bold text-purple-200 uppercase tracking-wider block">Spell Attendance %</span>
            <h3 className="text-xl font-black text-white">{spellData ? spellData.spellPercentage : 0}%</h3>
            <p className="text-[10px] text-purple-100 font-bold">
              {spellData && spellData.spellPercentage >= 75 ? '✓ Safe Status' : '⚠ Shortage Risk'}
            </p>
          </div>
        </div>
      </div>

      {/* Student Widgets Metric Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Attendance Percentage */}
        <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-2 hover:border-[#6D5DFC]/40 transition-all">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
            <span>Overall Attendance</span>
            <Award className="w-4 h-4 text-[#6D5DFC]" />
          </div>
          <p className={`font-display font-extrabold text-3xl ${attendanceRate !== null && attendanceRate >= 75 ? 'text-[#12B76A]' : attendanceRate !== null ? 'text-rose-600' : 'text-slate-400'}`}>
            {attendanceRate !== null ? `${attendanceRate}%` : '--'}
          </p>
          <div className="w-full bg-[#FAFAFA] rounded-full h-2 border border-[#E7E7E7] overflow-hidden">
            <div className="bg-[#6D5DFC] h-full rounded-full transition-all duration-500" style={{ width: `${attendanceRate || 0}%` }} />
          </div>
          <p className="text-[10px] text-[#6B7280] font-medium">75% minimum institutional requirement</p>
        </div>

        {/* Classes Attended */}
        <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-2 hover:border-[#12B76A]/40 transition-all">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
            <span>Classes Attended</span>
            <CheckCircle2 className="w-4 h-4 text-[#12B76A]" />
          </div>
          <p className="font-display font-extrabold text-3xl text-[#12B76A]">{presentClasses}</p>
          <p className="text-[10px] text-[#12B76A] font-semibold">Verified via QR scan</p>
        </div>

        {/* Classes Missed */}
        <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-2 hover:border-rose-400/40 transition-all">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
            <span>Classes Missed</span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <p className="font-display font-extrabold text-3xl text-rose-600">{missedClasses}</p>
          <p className="text-[10px] text-rose-500 font-medium">Absences recorded</p>
        </div>

        {/* Current Streak */}
        <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-2 hover:border-amber-400/40 transition-all">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
            <span>Active Streak</span>
            <Flame className="w-4 h-4 text-amber-500" />
          </div>
          <p className="font-display font-extrabold text-3xl text-amber-500">{streak} Days</p>
          <p className="text-[10px] text-amber-600 font-medium">Consecutive lecture check-ins</p>
        </div>
      </div>

      {/* Attendance Recovery Calculator (If below 75%) */}
      {attendanceRate !== null && attendanceRate < 75 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-[24px] p-6 shadow-enterprise space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-base text-amber-900">Attendance Recovery Calculator</h3>
              <p className="text-xs text-amber-700 font-medium">Auto-generated target plan to reach 75% mandatory threshold</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-2">
            <div className="p-3 bg-white/80 rounded-2xl border border-amber-200">
              <span className="text-[10px] text-amber-700 font-bold block uppercase">Current Attendance</span>
              <strong className="text-lg text-rose-600 font-extrabold">{attendanceRate}%</strong>
            </div>
            <div className="p-3 bg-white/80 rounded-2xl border border-amber-200">
              <span className="text-[10px] text-amber-700 font-bold block uppercase">Required Minimum</span>
              <strong className="text-lg text-[#12B76A] font-extrabold">75%</strong>
            </div>
            <div className="p-3 bg-white/80 rounded-2xl border border-amber-200">
              <span className="text-[10px] text-amber-700 font-bold block uppercase">Consecutive Classes Needed</span>
              <strong className="text-lg text-amber-700 font-extrabold">{classesNeededForRecovery} Classes</strong>
            </div>
            <div className="p-3 bg-white/80 rounded-2xl border border-amber-200">
              <span className="text-[10px] text-amber-700 font-bold block uppercase">Est. Recovery Window</span>
              <strong className="text-xs text-amber-900 font-bold">~{Math.ceil(classesNeededForRecovery / 4)} Academic Days</strong>
            </div>
          </div>
        </div>
      )}

      {/* Grid for Today's Schedule (All 8 Periods) & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule Card */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-3">
            <div>
              <h3 className="font-display font-bold text-base text-[#111827] flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#6D5DFC]" />
                Today's Master Schedule — {todayDayOrderLabel} (Periods 1 to 8)
              </h3>
              <p className="text-xs text-[#6B7280] font-medium">Automatic daily schedule order with live active period tracking</p>
            </div>
            <span className="px-3 py-1 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-bold text-xs border border-[#6D5DFC]/20">
              {todaysClassesSorted.length} Periods Configured
            </span>
          </div>

          {todaysClassesSorted.length === 0 ? (
            <div className="p-8 lg:p-12 rounded-[24px] bg-gradient-to-br from-[#FAFAFA] via-[#F3F0FF]/30 to-[#FAFAFA] border-2 border-dashed border-[#6D5DFC]/30 text-center space-y-4 relative overflow-hidden my-2">
              <div className="w-16 h-16 rounded-3xl bg-[#F3F0FF] text-[#6D5DFC] flex items-center justify-center mx-auto shadow-sm border border-[#6D5DFC]/20 animate-bounce">
                <Calendar className="w-8 h-8 text-[#6D5DFC]" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <span className="px-3 py-1 rounded-full bg-[#ECFDF5] text-[#12B76A] font-mono font-extrabold text-[10px] uppercase tracking-wider border border-[#12B76A]/20">
                  🎉 FREE ACADEMIC DAY
                </span>
                <h4 className="font-display font-extrabold text-xl text-[#111827]">
                  No Classes Scheduled for {todayName}
                </h4>
                <p className="text-xs text-[#6B7280] font-medium leading-relaxed">
                  You currently have no lectures assigned for {todayName}. Enjoy your free period and check back later for timetable updates.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-center gap-2">
                <span className="px-3 py-1 rounded-full bg-white border border-[#E7E7E7] text-[11px] text-[#6B7280] font-bold shadow-xs">
                  ⚡ Automatic Timetable Synchronization
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {todaysClassesSorted.map((item, idx) => {
                const sMins = parseTime(item.start_time);
                const eMins = parseTime(item.end_time);
                const isActive = nowMins >= sMins && nowMins <= eMins;
                const pNumStr = String(item.period_number || idx + 1);
                const isAttended = todayAttendedPeriodSet.has(pNumStr) || todayAttendedPeriodSet.has(item.id || '');

                return (
                  <div
                    key={idx}
                    className={`p-4 rounded-2xl border transition-all space-y-2 relative overflow-hidden ${
                      isAttended
                        ? 'bg-[#ECFDF5]/80 border-[#12B76A]/40 shadow-sm'
                        : isActive
                        ? 'bg-[#F3F0FF]/60 border-[#6D5DFC]/40 shadow-sm'
                        : 'bg-[#FAFAFA] border-[#E7E7E7] hover:border-[#6D5DFC]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-extrabold text-[#6D5DFC] px-2.5 py-0.5 rounded-full bg-[#F3F0FF] border border-[#6D5DFC]/20">
                          P{item.period_number || idx + 1}
                        </span>
                        {isAttended ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/30 font-mono font-extrabold text-[9px] uppercase tracking-wider flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-[#12B76A]" /> ATTENDED
                          </span>
                        ) : isActive ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#12B76A] text-white font-mono font-extrabold text-[9px] uppercase tracking-wider animate-pulse">
                            ● ACTIVE NOW
                          </span>
                        ) : null}
                      </div>

                      <span className="text-[11px] font-mono text-[#6B7280] font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-[#6D5DFC]" /> {item.start_time} - {item.end_time}
                      </span>
                    </div>

                    <h4 className="font-display font-extrabold text-sm text-[#111827]">{item.subject_name}</h4>

                    <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-1 border-t border-[#E7E7E7]">
                      <span>Faculty: <strong className="text-[#4F7CFF]">{item.faculty_name}</strong></span>
                      <span className="px-2 py-0.5 rounded-full bg-white border border-[#E7E7E7] font-mono text-[#111827] font-bold text-[10px]">
                        Room {item.room_number || 'F305'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notifications & System Alerts */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7E7E7] pb-3">
            <h3 className="font-display font-bold text-base text-[#111827] flex items-center gap-2">
              <Bell className="w-5 h-5 text-[#4F7CFF]" />
              Academic Notifications
            </h3>
            <span className="w-2 h-2 rounded-full bg-[#12B76A]" />
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-2xl bg-[#F3F0FF] border border-[#6D5DFC]/20 space-y-1">
              <span className="font-bold text-[#6D5DFC] block">Geofence Attendance Engine</span>
              <p className="text-[#6B7280]">Make sure your location services (GPS) are enabled when scanning QR code.</p>
            </div>
            <div className="p-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1">
              <span className="font-bold text-[#111827] block">75% Attendance Mandatory</span>
              <p className="text-[#6B7280]">Minimum 75% attendance is required to qualify for university examinations.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance Log Table */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-[#111827] flex items-center gap-2">
              <History className="w-5 h-5 text-[#6D5DFC]" />
              Recent Attendance History
            </h3>
            <p className="text-xs text-[#6B7280] font-medium">Verified attendance timestamps, codes, and geofence verification distance</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E7E7E7] text-[#6B7280] uppercase text-[10px] font-bold">
              <tr>
                <th className="pb-3">Subject / Course</th>
                <th className="pb-3">Attendance Code</th>
                <th className="pb-3">Verified Timestamp</th>
                <th className="pb-3">Geofence Distance</th>
                <th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7E7E7]">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[#6B7280]">
                    No attendance records found yet. Scan a lecture QR code to record attendance.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="hover:bg-[#FAFAFA] transition-colors">
                    <td className="py-3.5 font-bold text-[#111827]">{h.subject || 'Lecture Session'}</td>
                    <td className="py-3.5 font-mono text-[#6D5DFC] font-bold">{h.attendance_code || '4821'}</td>
                    <td className="py-3.5 font-mono text-[#6B7280]">{new Date(h.attendance_time).toLocaleString()}</td>
                    <td className="py-3.5 font-mono text-[#12B76A] flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{h.distance_meters} meters</span>
                    </td>
                    <td className="py-3.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20">
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
