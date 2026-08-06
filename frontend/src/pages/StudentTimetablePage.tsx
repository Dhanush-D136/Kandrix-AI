import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TimetableItem } from '../types';
import { Calendar, Clock, MapPin, UserCheck, Sparkles, BookOpen, Layers } from 'lucide-react';

import { HeroBanner } from '../components/HeroBanner';

import { getSocket } from '../services/socket';

export const StudentTimetablePage: React.FC = () => {
  const { user } = useAuth();
  const [timetables, setTimetables] = useState<TimetableItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timetableMode, setTimetableMode] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const allDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayName = allDays[new Date().getDay()];
  const [activeDay, setActiveDay] = useState<string>(todayName);

  const dayOrderMap: Record<string, string> = {
    'Monday': 'Monday • Day Order 1',
    'Tuesday': 'Tuesday • Day Order 2',
    'Wednesday': 'Wednesday • Day Order 3',
    'Thursday': 'Thursday • Day Order 4',
    'Friday': 'Friday • Day Order 5',
    'Saturday': 'Saturday • Off Day',
    'Sunday': 'Sunday • Off Day'
  };
  const activeDayOrderLabel = dayOrderMap[activeDay] || activeDay;

  const fetchStudentTimetable = () => {
    const dept = user?.department || 'AI & DS';
    const yr = user?.year || 3;
    const sec = user?.section || 'A';

    setIsLoading(true);
    api.get(`/timetable/student?student_id=${user?.id || ''}&department=${encodeURIComponent(dept)}&year=${yr}&section=${sec}`)
      .then((res) => setTimetables(res.data.timetables || []))
      .catch((err) => console.error('Failed to load student timetable', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchStudentTimetable();

    // Subscribe to Socket.IO realtime timetable synchronization events
    const socket = getSocket();
    const handleTimetableUpdate = () => {
      console.log('⚡ [STUDENT TIMETABLE] Real-time timetable change detected. Refetching schedule...');
      fetchStudentTimetable();
    };

    socket.on('timetable_created', handleTimetableUpdate);
    socket.on('timetable_updated', handleTimetableUpdate);
    socket.on('timetable_deleted', handleTimetableUpdate);
    socket.on('timetable_changed', handleTimetableUpdate);

    return () => {
      socket.off('timetable_created', handleTimetableUpdate);
      socket.off('timetable_updated', handleTimetableUpdate);
      socket.off('timetable_deleted', handleTimetableUpdate);
      socket.off('timetable_changed', handleTimetableUpdate);
    };
  }, [user?.department, user?.year, user?.section, user?.id]);

  const todayClasses = timetables.filter((t) => (t.day || '').toLowerCase() === todayName.toLowerCase()).sort((a, b) => (Number(a.period_number) || 0) - (Number(b.period_number) || 0));
  const activeDayClasses = timetables.filter((t) => (t.day || '').toLowerCase() === activeDay.toLowerCase()).sort((a, b) => (Number(a.period_number) || 0) - (Number(b.period_number) || 0));

  const parseMins = (tStr?: string) => {
    if (!tStr) return 0;
    const clean = tStr.trim();
    const parts = clean.split(' ');
    const timeParts = parts[0].split(':');
    let hrs = parseInt(timeParts[0], 10);
    const mins = parseInt(timeParts[1] || '0', 10);
    if (parts[1] && parts[1].toUpperCase() === 'PM' && hrs < 12) hrs += 12;
    if (parts[1] && parts[1].toUpperCase() === 'AM' && hrs === 12) hrs = 0;
    return hrs * 60 + mins;
  };

  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  let currentClass: TimetableItem | null = null;
  let nextClass: TimetableItem | null = null;

  for (let i = 0; i < todayClasses.length; i++) {
    const slot = todayClasses[i];
    const startM = parseMins(slot.start_time);
    const endM = parseMins(slot.end_time);

    if (nowMins >= startM && nowMins <= endM) {
      currentClass = slot;
      nextClass = todayClasses[i + 1] || null;
      break;
    } else if (nowMins < startM && !nextClass) {
      nextClass = slot;
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Banner Section */}
      <HeroBanner />

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-[#111827]">My Class Timetable</h1>
          <p className="text-xs text-[#6B7280] font-medium mt-1">
            {user?.department || 'AI & DS'} • Year {user?.year || 3}, Section {user?.section || 'A'} Lecture Schedule
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="bg-[#FAFAFA] p-1 rounded-2xl border border-[#E7E7E7] flex items-center gap-1">
          <button
            onClick={() => setTimetableMode('daily')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timetableMode === 'daily' ? 'bg-[#6D5DFC] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Daily View
          </button>
          <button
            onClick={() => setTimetableMode('weekly')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timetableMode === 'weekly' ? 'bg-[#6D5DFC] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Weekly View
          </button>
          <button
            onClick={() => setTimetableMode('monthly')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              timetableMode === 'monthly' ? 'bg-[#6D5DFC] text-white shadow-sm' : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            Monthly View
          </button>
        </div>
      </div>

      {/* Current & Next Class Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current Class */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20 text-xs font-bold uppercase tracking-wider">
              Today's Current Lecture
            </span>
            <Sparkles className="w-4 h-4 text-[#12B76A]" />
          </div>

          {currentClass ? (
            <div>
              <h3 className="font-display font-extrabold text-xl text-[#111827]">{currentClass.subject_name}</h3>
              <div className="mt-2 space-y-1 text-xs text-[#6B7280]">
                <p className="font-mono text-[#6D5DFC] font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#6D5DFC]" />
                  Period {currentClass.period_number || 1} • {currentClass.start_time} - {currentClass.end_time}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-bold text-[#111827] flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-[#4F7CFF]" />
                    Faculty: {currentClass.faculty_name}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#F7F3EE] border border-[#E7E7E7] font-mono text-[#111827] font-bold">
                    Room {currentClass.room_number}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#6B7280] font-medium py-4">No class scheduled right now for today.</p>
          )}
        </div>

        {/* Next Class */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-3">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-full bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20 text-xs font-bold uppercase tracking-wider">
              Next Scheduled Lecture
            </span>
            <BookOpen className="w-4 h-4 text-[#6D5DFC]" />
          </div>

          {nextClass ? (
            <div>
              <h3 className="font-display font-extrabold text-xl text-[#111827]">{nextClass.subject_name}</h3>
              <div className="mt-2 space-y-1 text-xs text-[#6B7280]">
                <p className="font-mono text-[#6D5DFC] font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#6D5DFC]" />
                  Period {nextClass.period_number || 2} • {nextClass.start_time} - {nextClass.end_time}
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-bold text-[#111827] flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-[#4F7CFF]" />
                    Faculty: {nextClass.faculty_name}
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-[#F7F3EE] border border-[#E7E7E7] font-mono text-[#111827] font-bold">
                    Room {nextClass.room_number}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#6B7280] font-medium py-4">No further lectures scheduled for today.</p>
          )}
        </div>
      </div>

      {/* MODE 1: DAILY VIEW */}
      {timetableMode === 'daily' && (
        <div className="space-y-4">
          {/* Day Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {days.map((d) => (
              <button
                key={d}
                onClick={() => setActiveDay(d)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
                  activeDay === d
                    ? 'bg-[#6D5DFC] text-white shadow-floating'
                    : 'bg-white text-[#6B7280] border border-[#E7E7E7] hover:bg-[#FAFAFA]'
                }`}
              >
                {d} {d === todayName ? '(Today)' : ''}
              </button>
            ))}
          </div>

          <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
            <h3 className="font-display font-bold text-base text-[#111827]">
              {activeDayOrderLabel} Class Schedule ({activeDayClasses.length} Lectures)
            </h3>

            {activeDayClasses.length === 0 ? (
              <div className="p-8 lg:p-12 rounded-[24px] bg-gradient-to-br from-[#FAFAFA] via-[#F3F0FF]/30 to-[#FAFAFA] border-2 border-dashed border-[#6D5DFC]/30 text-center space-y-4 relative overflow-hidden my-2">
                <div className="w-16 h-16 rounded-3xl bg-[#F3F0FF] text-[#6D5DFC] flex items-center justify-center mx-auto shadow-sm border border-[#6D5DFC]/20 animate-bounce">
                  <Calendar className="w-8 h-8 text-[#6D5DFC]" />
                </div>

                <div className="space-y-1.5 max-w-md mx-auto">
                  <span className="px-3 py-1 rounded-full bg-[#ECFDF5] text-[#12B76A] font-mono font-extrabold text-[10px] uppercase tracking-wider border border-[#12B76A]/20">
                    🎉 FREE ACADEMIC DAY
                  </span>
                  <h4 className="font-display font-extrabold text-xl text-[#111827]">
                    No Classes Scheduled for {activeDay}
                  </h4>
                  <p className="text-xs text-[#6B7280] font-medium leading-relaxed">
                    You currently have no lectures assigned for {activeDay}. Enjoy your free period and check back later for timetable updates.
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-white border border-[#E7E7E7] text-[11px] text-[#6B7280] font-bold shadow-xs">
                    ⚡ Automatic Timetable Synchronization
                  </span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeDayClasses.map((tt) => (
                  <div key={tt.id} className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-3 hover:border-[#6D5DFC]/40 transition-all flex flex-col justify-between shadow-sm">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-[#E7E7E7]">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20 font-mono">
                          Period {tt.period_number || 1}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white border border-[#E7E7E7] text-[#111827] font-mono">
                          Room {tt.room_number}
                        </span>
                      </div>

                      <h4 className="font-display font-extrabold text-base text-[#111827] mt-2">{tt.subject_name}</h4>

                      <div className="mt-2 space-y-1.5 text-xs text-[#6B7280]">
                        <div className="flex items-center gap-1.5 font-mono text-[#6D5DFC] font-bold">
                          <Clock className="w-3.5 h-3.5 text-[#6D5DFC]" />
                          <span>{tt.start_time} - {tt.end_time}</span>
                        </div>

                        <div className="flex items-center gap-1 text-[#111827] font-semibold pt-1">
                          <UserCheck className="w-3.5 h-3.5 text-[#4F7CFF]" />
                          <span>Faculty: {tt.faculty_name}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: WEEKLY VIEW */}
      {timetableMode === 'weekly' && (
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
          <h3 className="font-display font-extrabold text-lg text-[#111827]">Full Weekly Timetable Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {days.map((day) => {
              const daySlots = timetables.filter((t) => t.day === day);
              return (
                <div key={day} className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E7E7E7]">
                    <h4 className="font-bold text-sm text-[#111827]">{day}</h4>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#E7E7E7]">
                      {daySlots.length} Classes
                    </span>
                  </div>

                  {daySlots.length === 0 ? (
                    <p className="text-[11px] text-[#9CA3AF] py-3 text-center">No scheduled lectures</p>
                  ) : (
                    <div className="space-y-2">
                      {daySlots.map((s) => (
                        <div key={s.id} className="p-3 rounded-xl bg-white border border-[#E7E7E7] text-xs space-y-1">
                          <div className="flex items-center justify-between font-bold text-[#111827]">
                            <span>{s.subject_name}</span>
                            <span className="font-mono text-[10px] text-[#6D5DFC]">P{s.period_number || 1}</span>
                          </div>
                          <p className="font-mono text-[10px] text-[#6B7280]">{s.start_time} - {s.end_time} • Room {s.room_number}</p>
                          <p className="text-[10px] text-[#4F7CFF] font-semibold">{s.faculty_name}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODE 3: MONTHLY VIEW */}
      {timetableMode === 'monthly' && (
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
            <h3 className="font-display font-extrabold text-lg text-[#111827]">Monthly Academic Schedule Calendar</h3>
            <span className="px-3 py-1 rounded-full bg-[#F3F0FF] text-[#6D5DFC] text-xs font-bold border border-[#6D5DFC]/20">
              Semester V (2026-2027)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-center text-xs">
            {['Week 1', 'Week 2', 'Week 3', 'Week 4'].map((w, idx) => (
              <div key={w} className="p-4 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-2">
                <span className="font-bold text-[#111827]">{w}</span>
                <p className="text-[10px] text-[#6B7280] font-medium">{timetables.length * 5} Total Conducted Lectures</p>
                <div className="w-full bg-[#E7E7E7] h-1.5 rounded-full overflow-hidden">
                  <div className="bg-[#6D5DFC] h-full rounded-full" style={{ width: `${85 + idx * 3}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

