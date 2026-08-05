import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { getSocket } from '../services/socket';
import { DashboardMetrics, AttendanceRecord } from '../types';
import { AdminDebugPanel } from '../components/AdminDebugPanel';
import { Users, CheckCircle2, XCircle, Percent, QrCode, TrendingUp, Radio, Activity, Sparkles, ArrowUpRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';

import { DataIntegrityAuditPanel } from '../components/DataIntegrityAuditPanel';

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [liveScans, setLiveScans] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await api.get('/analytics/dashboard');
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to load dashboard metrics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const socket = getSocket();

    const handleSync = () => {
      fetchMetrics();
    };

    socket.on('attendance_updated', handleSync);
    socket.on('attendance_marked', handleSync);
    socket.on('attendanceMarked', handleSync);
    socket.on('session_created', handleSync);
    socket.on('session_ended', handleSync);

    return () => {
      socket.off('attendance_updated', handleSync);
      socket.off('attendance_marked', handleSync);
      socket.off('attendanceMarked', handleSync);
      socket.off('session_created', handleSync);
      socket.off('session_ended', handleSync);
    };
  }, []);

  if (isLoading || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-[#6B7280]">
          <Activity className="w-8 h-8 animate-spin text-[#6D5DFC]" />
          <p className="text-xs font-semibold">Loading Executive Telemetry...</p>
        </div>
      </div>
    );
  }

  const { overview, departmentStats, dailyTrends } = metrics;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-extrabold text-2xl text-[#111827]">Executive Overview</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F3F0FF] text-[#6D5DFC] border border-[#6D5DFC]/20">
              Live Telemetry
            </span>
          </div>
          <p className="text-xs text-[#6B7280] font-medium mt-1">Real-time attendance telemetry, geofence verification & department insights</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-[#E7E7E7] text-xs text-[#12B76A] shadow-sm font-semibold">
          <Radio className="w-4 h-4 animate-pulse text-[#12B76A]" />
          <span>Socket.IO Engine Active</span>
        </div>
      </div>

      {/* Hero Banner Section */}
      <HeroBanner />

      {/* Admin Telemetry Debug Panel */}
      <AdminDebugPanel />

      {/* Data Integrity Audit & One-Click Repair Tool */}
      <DataIntegrityAuditPanel />

      {/* Executive Metric Cards Grid (Stripe / Ramp Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-3 hover:border-[#6D5DFC]/40 transition-all">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
            <span>Total Students</span>
            <div className="w-8 h-8 rounded-xl bg-[#F3F0FF] text-[#6D5DFC] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="font-display font-extrabold text-2xl text-[#111827]">{overview.totalStudents}</p>
            <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">Enrolled across departments</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-3 hover:border-[#12B76A]/40 transition-all">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
            <span>Present Today</span>
            <div className="w-8 h-8 rounded-xl bg-[#ECFDF5] text-[#12B76A] flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="font-display font-extrabold text-2xl text-[#12B76A]">{overview.presentToday}</p>
            <p className="text-[11px] text-[#12B76A] font-semibold mt-0.5">Geofence verified in class</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-3 hover:border-rose-400/40 transition-all">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
            <span>Absent Today</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="font-display font-extrabold text-2xl text-rose-600">{overview.absentToday}</p>
            <p className="text-[11px] text-rose-500 font-medium mt-0.5">Unverified / Absent</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-3 hover:border-[#6D5DFC]/40 transition-all">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
            <span>Attendance Rate</span>
            <div className="w-8 h-8 rounded-xl bg-[#F3F0FF] text-[#6D5DFC] flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="font-display font-extrabold text-2xl text-[#6D5DFC]">
              {overview.attendancePercentage !== null && overview.attendancePercentage !== undefined ? `${overview.attendancePercentage}%` : '--'}
            </p>
            <p className="text-[11px] text-[#6B7280] font-medium mt-0.5">Institutional daily average</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-3 hover:border-[#4F7CFF]/40 transition-all sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-[#6B7280] text-xs font-semibold">
            <span>Active Sessions</span>
            <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] text-[#4F7CFF] flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="font-display font-extrabold text-2xl text-[#4F7CFF]">{overview.activeSessions}</p>
            <p className="text-[11px] text-[#4F7CFF] font-medium mt-0.5">Live QR rotating sessions</p>
          </div>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Attendance Trend Line Chart */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-base text-[#111827]">Daily Attendance Trends</h3>
              <p className="text-xs text-[#6B7280] font-medium">Verified check-ins recorded per day</p>
            </div>
            <div className="p-2 rounded-xl bg-[#F7F3EE] text-[#111827]">
              <TrendingUp className="w-4 h-4 text-[#6D5DFC]" />
            </div>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrends.length > 0 ? dailyTrends : [{ date: 'Today', count: overview.presentToday }]}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6D5DFC" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6D5DFC" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="date" stroke="#9CA3AF" fontSize={11} />
                <YAxis stroke="#9CA3AF" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E7E7E7', borderRadius: '16px', fontSize: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }} />
                <Area type="monotone" dataKey="count" stroke="#6D5DFC" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Scan Telemetry Stream Feed */}
        <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E7E7E7]">
              <h3 className="font-display font-bold text-base text-[#111827] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#12B76A] animate-pulse" />
                Live Scan Feed
              </h3>
              <span className="text-[10px] text-[#6B7280] font-semibold uppercase">Realtime</span>
            </div>

            <div className="space-y-2.5 mt-4 max-h-[230px] overflow-y-auto pr-1">
              {liveScans.length === 0 ? (
                <div className="text-center py-10 text-[#6B7280] text-xs">
                  <p className="font-medium">Listening for incoming student QR scans...</p>
                </div>
              ) : (
                liveScans.map((scan, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] flex items-center justify-between text-xs hover:border-[#6D5DFC]/30 transition-all">
                    <div className="flex items-center gap-3">
                      <img src={scan.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt="" className="w-8 h-8 rounded-full object-cover border border-[#E7E7E7]" />
                      <div>
                        <p className="font-bold text-[#111827]">{scan.student_name}</p>
                        <p className="text-[10px] text-[#6B7280] font-mono">{scan.roll_number} • {scan.distance_meters}m</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20">
                      {scan.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <p className="text-[11px] text-[#6B7280] text-center pt-3 border-t border-[#E7E7E7] font-medium">
            KANDRIX AI Attendance System Realtime Telemetry
          </p>
        </div>
      </div>

      {/* Department Breakdown Bar Chart */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-[#111827]">Department Enrollment Breakdown</h3>
            <p className="text-xs text-[#6B7280] font-medium">Total registered students by academic department</p>
          </div>
          <Sparkles className="w-4 h-4 text-[#4F7CFF]" />
        </div>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departmentStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="department" stroke="#9CA3AF" fontSize={11} />
              <YAxis stroke="#9CA3AF" fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E7E7E7', borderRadius: '16px', fontSize: '12px' }} />
              <Bar dataKey="student_count" fill="#4F7CFF" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
