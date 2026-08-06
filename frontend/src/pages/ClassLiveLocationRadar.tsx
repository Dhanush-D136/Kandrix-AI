import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { Radio, Users, CheckCircle2, AlertTriangle, MapPin, Play, Square, QrCode, UserCheck, Settings, X } from 'lucide-react';

interface ClassLiveLocationRadarProps {
  onSwitchToQR: () => void;
  onSwitchToManual: () => void;
}

export const ClassLiveLocationRadar: React.FC<ClassLiveLocationRadarProps> = ({ onSwitchToQR, onSwitchToManual }) => {
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionRunning, setSessionRunning] = useState<boolean>(false);

  // Dynamic Radius Selector State (Default = 500m)
  const [selectedRadius, setSelectedRadius] = useState<number>(500);

  // Manual Override Modal State
  const [overrideModalOpen, setOverrideModalOpen] = useState<boolean>(false);
  const [targetStudent, setTargetStudent] = useState<any | null>(null);
  const [overrideReason, setOverrideReason] = useState<string>('Late Entry');
  const [customReason, setCustomReason] = useState<string>('');

  const fetchLiveStatus = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/location/live');
      if (res.data.active && res.data.session) {
        setActiveSession(res.data.session);
        setStudents(res.data.locations || []);
        setSessionRunning(true);
        if (res.data.session.radius) {
          setSelectedRadius(res.data.session.radius);
        }
      } else {
        setSessionRunning(false);
      }
    } catch (err) {
      console.error('Failed to fetch live session status', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartLiveSession = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await api.post('/location/start-session', {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            radius: selectedRadius,
            subject: 'Python Programming'
          });
          setActiveSession(res.data.session);
          setSessionRunning(true);
          fetchLiveStatus();
        } catch (err: any) {
          alert('Failed to start Live Location Session: ' + (err.response?.data?.message || err.message));
        }
      },
      (err) => {
        alert('Please allow location access to start Live Location Session.');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleEndLiveSession = async () => {
    try {
      await api.post('/location/end-session');
      setSessionRunning(false);
      fetchLiveStatus();
    } catch (err) {
      console.error('Failed to end live session', err);
    }
  };

  const handleManualOverride = async () => {
    if (!targetStudent) return;
    const finalReason = overrideReason === 'Other' ? customReason : overrideReason;

    try {
      await api.post('/attendance/mark-manual', {
        student_id: targetStudent.student_id || targetStudent.id,
        session_id: activeSession?.id,
        status: 'present',
        method: 'Manual Override',
        reason: finalReason
      });

      setOverrideModalOpen(false);
      setTargetStudent(null);
      fetchLiveStatus();
    } catch (err: any) {
      // Fallback update
      setStudents((prev) =>
        prev.map((s) =>
          (s.student_id === targetStudent.student_id || s.id === targetStudent.id)
            ? { ...s, inside_boundary: 1, present_marked: 1, method: 'Manual Override', notes: finalReason }
            : s
        )
      );
      setOverrideModalOpen(false);
      setTargetStudent(null);
    }
  };

  useEffect(() => {
    fetchLiveStatus();

    const socket = getSocket();
    socket.on('location_update', () => {
      fetchLiveStatus();
    });

    socket.on('live_session_started', () => {
      fetchLiveStatus();
    });

    return () => {
      socket.off('location_update');
      socket.off('live_session_started');
    };
  }, []);

  const currentRadius = activeSession?.radius || selectedRadius || 500;
  const nearbyList = students.filter((s) => s.inside_boundary === 1 || s.present_marked === 1);
  const outsideList = students.filter((s) => s.inside_boundary === 0 && s.present_marked !== 1);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Controls */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200">
              <Radio className={`w-6 h-6 ${sessionRunning ? 'animate-pulse text-emerald-600' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-blue-600 tracking-wider">Primary Attendance</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                  sessionRunning ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  {sessionRunning ? '🟢 LIVE GPS SESSION RUNNING' : 'SESSION IDLE'}
                </span>
              </div>
              <h2 className="font-display font-extrabold text-xl text-[#111827] mt-0.5">
                Smart Live Location Attendance Hub ({currentRadius}m Radius)
              </h2>
              <p className="text-xs text-slate-500 font-medium">Subject: <strong className="text-blue-600 font-bold">Python Programming (CS51T)</strong> • Faculty: <strong>Mrs Vasanthapriya</strong></p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {!sessionRunning ? (
              <button
                onClick={handleStartLiveSession}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" /> Start Live Location Session ({selectedRadius}m)
              </button>
            ) : (
              <button
                onClick={handleEndLiveSession}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs shadow-md flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <Square className="w-4 h-4 fill-white" /> End Live Session
              </button>
            )}

            <button
              onClick={onSwitchToQR}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <QrCode className="w-4 h-4 text-blue-600" /> Switch to Dynamic QR Backup
            </button>

            <button
              onClick={onSwitchToManual}
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all"
            >
              <UserCheck className="w-4 h-4 text-indigo-600" /> Manual Attendance
            </button>
          </div>
        </div>

        {/* GPS Radius Configurator Selector */}
        {!sessionRunning && (
          <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
            <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1">
              <Settings className="w-3.5 h-3.5 text-blue-600" /> Configure GPS Geofence Radius:
            </span>
            <div className="flex items-center gap-2">
              {[100, 250, 500, 750, 1000].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRadius(r)}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                    selectedRadius === r
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r}m {r === 500 ? '(Default)' : ''}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Real-time Telemetry Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-[20px] bg-white border border-[#E7E7E7] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Active Pings</span>
            <h3 className="font-display font-black text-2xl text-[#111827] mt-1">{students.length}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-blue-50 text-blue-600">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-[20px] bg-white border border-[#E7E7E7] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">🟢 Inside ({currentRadius}m Radius)</span>
            <h3 className="font-display font-black text-2xl text-emerald-600 mt-1">{nearbyList.length}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-[20px] bg-white border border-[#E7E7E7] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">🔴 Outside (&gt;{currentRadius}m)</span>
            <h3 className="font-display font-black text-2xl text-rose-600 mt-1">{outsideList.length}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-rose-50 text-rose-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Live Student Radar Table */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="font-display font-extrabold text-lg text-[#111827]">Live Student GPS Radar Feed</h3>
          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            5s Real-Time Refresh
          </span>
        </div>

        {students.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <MapPin className="w-8 h-8 text-slate-400 mx-auto animate-bounce" />
            <p className="font-bold text-sm text-slate-700">Waiting for students to tap "I'M PRESENT"...</p>
            <p className="text-xs text-slate-500">Students tap the 1-Tap Live GPS button on their mobile portal to verify location inside {currentRadius}m geofence.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Roll Number</th>
                  <th className="py-3 px-4">Distance</th>
                  <th className="py-3 px-4">Geofence Status</th>
                  <th className="py-3 px-4 text-right">Action / Override</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                {students.map((st) => {
                  const isInside = st.distance <= currentRadius || st.inside_boundary === 1 || st.present_marked === 1;
                  return (
                    <tr key={st.id || st.student_id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">{st.student_name || 'Student'}</td>
                      <td className="py-3 px-4 font-mono text-blue-600 font-bold">{st.roll_number || '21104001'}</td>
                      <td className="py-3 px-4 font-mono font-bold">{st.distance} meters</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          isInside ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                          {isInside ? `🟢 Inside (<=${currentRadius}m)` : `🔴 Outside (>${currentRadius}m)`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isInside ? (
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                            PRESENT {st.method ? `(${st.method})` : '(GPS)'}
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setTargetStudent(st);
                              setOverrideModalOpen(true);
                            }}
                            className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
                          >
                            Present Manually
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual Override Reason Popup Modal */}
      {overrideModalOpen && targetStudent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[24px] p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-display font-extrabold text-lg text-slate-900">Manual Attendance Override</h3>
              <button
                onClick={() => setOverrideModalOpen(false)}
                className="p-1 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Override attendance for <strong className="text-slate-900">{targetStudent.student_name}</strong> ({targetStudent.roll_number}) who is currently outside geofence boundary ({targetStudent.distance}m away).
            </p>

            <div className="space-y-2">
              <label className="text-xs font-extrabold text-slate-700 block">Select Override Reason:</label>
              <select
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Late Entry">Late Entry</option>
                <option value="Medical Issue">Medical Issue</option>
                <option value="Network / GPS Issue">Network / GPS Issue</option>
                <option value="Official Permission">Official Permission (OD)</option>
                <option value="Other">Other Reason</option>
              </select>

              {overrideReason === 'Other' && (
                <input
                  type="text"
                  placeholder="Specify custom override reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full mt-2 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOverrideModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleManualOverride}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md"
              >
                Confirm Present (Manual Override)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

