import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import confetti from 'canvas-confetti';
import { MapPin, CheckCircle2, AlertCircle, RefreshCw, QrCode, ShieldCheck, Clock, Radio, ArrowLeft } from 'lucide-react';

interface LiveLocationViewProps {
  onSwitchToQR: () => void;
  onSuccessReturn?: () => void;
}

export const LiveLocationView: React.FC<LiveLocationViewProps> = ({ onSwitchToQR, onSuccessReturn }) => {
  const { user } = useAuth();

  const [tracking, setTracking] = useState<boolean>(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [allowedRadius, setAllowedRadius] = useState<number>(50);
  const [status, setStatus] = useState<'IDLE' | 'TRACKING' | 'PRESENT' | 'OUTSIDE' | 'ERROR'>('IDLE');
  const [statusMessage, setStatusMessage] = useState<string>('Tap "I\'m Present" to verify your classroom location.');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [presentRecord, setPresentRecord] = useState<any | null>(null);

  const watchIdRef = useRef<number | null>(null);

  const startGPSCheckIn = () => {
    if (!navigator.geolocation) {
      setStatus('ERROR');
      setStatusMessage('❌ Geolocation is not supported by your browser. Please use Dynamic QR Backup.');
      return;
    }

    setStatus('TRACKING');
    setTracking(true);
    setStatusMessage('📡 Acquiring high-accuracy GPS coordinates...');

    // Get current position & watch position every 5s
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        sendGPSPing(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setStatus('ERROR');
        setStatusMessage('⚠️ Location permission denied or GPS signal unavailable. Enable Location or use QR Scanner.');
        setTracking(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    if (watchIdRef.current === null) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          sendGPSPing(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn('GPS watchPosition warning:', err);
        },
        { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
      );
    }
  };

  const sendGPSPing = async (lat: number, lng: number) => {
    if (status === 'PRESENT' && presentRecord) return;

    try {
      setIsSubmitting(true);
      const res = await api.post('/location/update', {
        latitude: lat,
        longitude: lng
      });

      const dist = res.data.distanceMeters || 0;
      const radius = res.data.allowedRadius || 50;

      setDistance(dist);
      setAllowedRadius(radius);

      if (res.data.insideBoundary || res.data.status === 'PRESENT') {
        setStatus('PRESENT');
        setStatusMessage(`✅ Verified! You are inside classroom boundary (${dist}m away).`);
        setPresentRecord({
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          date: new Date().toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
          distance: dist
        });

        confetti({ particleCount: 100, spread: 80, origin: { y: 0.55 } });
      } else {
        setStatus('OUTSIDE');
        setStatusMessage(`⚠️ Outside Classroom Boundary (${dist}m away). Move closer to class (Max: ${radius}m).`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Unable to communicate with Live Location server.';
      setStatusMessage(`⚠️ ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const socket = getSocket();
    socket.on('location_update', (data: any) => {
      if (data.studentId === user?.id && data.insideBoundary) {
        setStatus('PRESENT');
      }
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      socket.off('location_update');
    };
  }, [user]);

  return (
    <div className="w-full max-w-md mx-auto space-y-4 animate-fade-in p-2 sm:p-0">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-[#6D5DFC] bg-[#F3F0FF] px-3 py-1.5 rounded-xl border border-[#6D5DFC]/20">
          PRIMARY ATTENDANCE: LIVE GPS
        </span>
        <button
          onClick={onSwitchToQR}
          className="flex items-center gap-1 text-xs font-bold text-slate-600 bg-white px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
        >
          <QrCode className="w-3.5 h-3.5 text-blue-600" /> QR Backup
        </button>
      </div>

      {/* Main Location Card */}
      <div className="bg-white p-6 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-5 text-center relative overflow-hidden">
        {/* Radar Icon */}
        <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center border-2 transition-all duration-300 ${
          status === 'PRESENT'
            ? 'bg-[#ECFDF5] border-[#12B76A] text-[#12B76A]'
            : status === 'OUTSIDE'
              ? 'bg-rose-50 border-rose-300 text-rose-600'
              : 'bg-blue-50 border-blue-300 text-blue-600'
        }`}>
          {status === 'PRESENT' ? (
            <CheckCircle2 className="w-12 h-12" />
          ) : (
            <Radio className={`w-10 h-10 ${tracking ? 'animate-ping' : ''}`} />
          )}
        </div>

        {/* Title */}
        <div className="space-y-1">
          <span className="inline-block px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold uppercase tracking-wider">
            Live GPS Geofence (50m Radius)
          </span>
          <h2 className="font-display font-black text-2xl text-[#111827]">
            {status === 'PRESENT' ? '✅ Attendance Verified' : 'Smart Live Location'}
          </h2>
          <p className="text-xs text-slate-500 font-medium whitespace-pre-line">
            {statusMessage}
          </p>
        </div>

        {/* Live Distance Meter Card */}
        {distance !== null && (
          <div className="bg-[#FAFAFA] rounded-2xl p-4 border border-[#E7E7E7] space-y-2 text-center">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span className="flex items-center gap-1 text-slate-700">
                <MapPin className="w-4 h-4 text-blue-600" /> Distance to Classroom
              </span>
              <span className="font-mono text-blue-600">{distance} meters</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${distance <= allowedRadius ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, Math.max(10, (1 - distance / 150) * 100))}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-mono text-right">Allowed Geofence: {allowedRadius}m</p>
          </div>
        )}

        {/* Action Button */}
        {status !== 'PRESENT' ? (
          <button
            onClick={startGPSCheckIn}
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-base shadow-lg shadow-blue-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Radio className="w-5 h-5 animate-pulse" />
            <span>I'M PRESENT</span>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#12B76A]/30 text-emerald-800 text-xs font-bold space-y-1">
              <p className="text-sm font-extrabold text-emerald-700">🎉 Attendance Successfully Recorded!</p>
              <p className="text-[11px] font-mono text-emerald-600">Recorded at {presentRecord?.time} • Distance: {presentRecord?.distance}m</p>
            </div>
            {onSuccessReturn && (
              <button
                onClick={onSuccessReturn}
                className="w-full py-3 rounded-2xl bg-[#6D5DFC] text-white text-xs font-extrabold shadow-md hover:bg-[#5b4be0] active:scale-95 transition-all"
              >
                Return to Dashboard
              </button>
            )}
          </div>
        )}

        {/* QR Backup Option Banner */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
          <span>Location issues? Use QR scanner:</span>
          <button
            type="button"
            onClick={onSwitchToQR}
            className="text-blue-600 font-extrabold hover:underline"
          >
            Scan Dynamic QR →
          </button>
        </div>
      </div>
    </div>
  );
};
