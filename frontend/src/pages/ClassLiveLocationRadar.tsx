import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { Radio, Users, CheckCircle2, AlertTriangle, MapPin, Play, Square, QrCode, UserCheck } from 'lucide-react';

interface ClassLiveLocationRadarProps {
  onSwitchToQR: () => void;
  onSwitchToManual: () => void;
}

export const ClassLiveLocationRadar: React.FC<ClassLiveLocationRadarProps> = ({ onSwitchToQR, onSwitchToManual }) => {
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionRunning, setSessionRunning] = useState<boolean>(false);

  const fetchLiveStatus = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/location/live');
      if (res.data.active && res.data.session) {
        setActiveSession(res.data.session);
        setStudents(res.data.locations || []);
        setSessionRunning(true);
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
            radius: 500,
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

  const nearbyList = students.filter((s) => s.inside_boundary === 1);
  const outsideList = students.filter((s) => s.inside_boundary === 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Controls */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
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
            <h2 className="font-display font-extrabold text-xl text-[#111827]">
              Smart Live Location Attendance Hub (500m Radius)
            </h2>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
          {!sessionRunning ? (
            <button
              onClick={handleStartLiveSession}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" /> Start Live Location Session
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
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">🟢 Nearby (Present)</span>
            <h3 className="font-display font-black text-2xl text-emerald-600 mt-1">{nearbyList.length}</h3>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-[20px] bg-white border border-[#E7E7E7] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">🔴 Outside Boundary</span>
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
            <p className="text-xs text-slate-500">Students tap the 1-Tap Live GPS button on their mobile portal to verify location.</p>
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
                  <th className="py-3 px-4 text-right">Attendance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
                {students.map((st) => (
                  <tr key={st.id || st.student_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{st.student_name || 'Student'}</td>
                    <td className="py-3 px-4 font-mono text-blue-600 font-bold">{st.roll_number || '21104001'}</td>
                    <td className="py-3 px-4 font-mono font-bold">{st.distance} meters</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                        st.inside_boundary === 1 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {st.inside_boundary === 1 ? '🟢 Inside (<=50m)' : '🔴 Outside (>50m)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-3 py-1 rounded-full text-xs font-black ${
                        st.inside_boundary === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {st.inside_boundary === 1 ? 'PRESENT' : 'OUTSIDE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
