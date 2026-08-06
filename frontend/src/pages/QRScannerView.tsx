import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import confetti from 'canvas-confetti';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { RefreshCw, CheckCircle2, AlertCircle, Terminal, ArrowLeft, Zap, MapPin, ShieldCheck, QrCode, ZoomIn, ZoomOut } from 'lucide-react';

interface QRScannerViewProps {
  onSuccessReturn: () => void;
}

export const QRScannerView: React.FC<QRScannerViewProps> = ({ onSuccessReturn }) => {
  const { user } = useAuth();
  const showDevPanel = user?.role === 'admin' && localStorage.getItem('smartattend_dev_mode') === 'true';

  const [cameraInitialized, setCameraInitialized] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Camera Zoom State
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [minZoom, setMinZoom] = useState<number>(1);
  const [maxZoom, setMaxZoom] = useState<number>(5);

  // QR Scan State
  const [qrScanned, setQrScanned] = useState<boolean>(false);

  // Debug Telemetry
  const [rawQrPayload, setRawQrPayload] = useState<string>('Waiting for scan...');
  const [parsedSessionId, setParsedSessionId] = useState<string>('None');
  const [parsedAttendanceCode, setParsedAttendanceCode] = useState<string>('None');
  const [insertStatus, setInsertStatus] = useState<string>('Idle');
  const [webSocketStatus, setWebSocketStatus] = useState<string>('Connected');
  const [scanErrorMessage, setScanErrorMessage] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successData, setSuccessData] = useState<any | null>(null);
  const [countdown, setCountdown] = useState<number>(3);

  const html5QrcodeScannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  // Zoom Handler: Dynamic Hardware & CSS Scale Zoom
  const applyZoom = async (newZoomLevel: number) => {
    const clampedZoom = Math.min(Math.max(newZoomLevel, minZoom), maxZoom);
    setZoomLevel(clampedZoom);

    // 1. Native Hardware Camera Zoom (Android/Chrome MediaStreamTrack)
    try {
      const videoElem = document.querySelector('#reader-stream-canvas video') as HTMLVideoElement | null;
      if (videoElem && videoElem.srcObject) {
        const stream = videoElem.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === 'function') {
          const capabilities = track.getCapabilities() as any;
          if (capabilities.zoom) {
            if (capabilities.zoom.min !== undefined && capabilities.zoom.min !== minZoom) {
              setMinZoom(capabilities.zoom.min);
            }
            if (capabilities.zoom.max !== undefined && capabilities.zoom.max !== maxZoom) {
              setMaxZoom(capabilities.zoom.max);
            }
            await track.applyConstraints({ advanced: [{ zoom: clampedZoom }] } as any);
          }
        }
      }
    } catch (err) {
      console.log('Hardware camera zoom apply constraint note:', err);
    }

    // 2. Smooth CSS Transform Scale Fallback (Guarantees visual zoom across all mobile devices)
    const videoElem = document.querySelector('#reader-stream-canvas video') as HTMLVideoElement | null;
    if (videoElem) {
      videoElem.style.transform = `scale(${clampedZoom})`;
      videoElem.style.transformOrigin = 'center center';
      videoElem.style.transition = 'transform 0.15s ease-out';
    }
  };

  // Start Camera
  const startCamera = async () => {
    const scannerId = 'reader-stream-canvas';

    const element = document.getElementById(scannerId);
    if (!element) return;

    try {
      setCameraError(null);

      if (html5QrcodeScannerRef.current) {
        try {
          await html5QrcodeScannerRef.current.stop();
        } catch (e) {}
      }

      const html5QrCode = new Html5Qrcode(scannerId);
      html5QrcodeScannerRef.current = html5QrCode;

      const config = {
        fps: 25,
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0
      };

      const onScanSuccess = (decodedText: string) => {
        if (!isProcessingRef.current) {
          handleQRScanned(decodedText);
        }
      };

      try {
        await html5QrCode.start({ facingMode: 'environment' }, config, onScanSuccess, () => {});
        setCameraInitialized(true);
      } catch (rearErr) {
        try {
          await html5QrCode.start({ facingMode: 'user' }, config, onScanSuccess, () => {});
          setCameraInitialized(true);
        } catch (frontErr) {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras && cameras.length > 0) {
            await html5QrCode.start(cameras[0].id, config, onScanSuccess, () => {});
            setCameraInitialized(true);
          } else {
            throw new Error('No camera hardware found on this device.');
          }
        }
      }
    } catch (err: any) {
      setCameraError(err.message || 'Camera permission denied or camera not available.');
      setCameraInitialized(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      startCamera();
    }, 100);

    return () => {
      clearTimeout(timer);
      if (html5QrcodeScannerRef.current) {
        html5QrcodeScannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // GPS Geolocation State
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<string>('Detecting GPS...');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsStatus(`✅ GPS Active (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)})`);
        },
        (err) => {
          setGpsStatus('⚠️ GPS Warning: Location access denied or unavailable');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const handleQRScanned = async (rawText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    setQrScanned(true);
    setRawQrPayload(rawText);
    setScanErrorMessage(null);
    setInsertStatus('Verifying Dynamic 7s QR + GPS Geofence...');

    let sId = 'Unknown';
    let aCode = rawText;

    if (rawText.startsWith('ATTENDANCE:')) {
      const parts = rawText.split(':');
      if (parts.length >= 3) {
        sId = parts[1];
        aCode = parts[2];
      } else if (parts.length === 2) {
        aCode = parts[1];
      }
    } else {
      try {
        const parsed = JSON.parse(rawText);
        sId = parsed.sessionId || 'Unknown';
        aCode = parsed.attendanceCode || rawText;
      } catch (e) {
        aCode = rawText;
      }
    }

    setParsedSessionId(sId);
    setParsedAttendanceCode(aCode);

    try {
      setIsSubmitting(true);

      const res = await api.post('/attendance/mark', {
        qr_payload: rawText,
        sessionId: sId,
        attendanceCode: aCode,
        student_lat: gpsLocation?.lat || 0,
        student_lng: gpsLocation?.lng || 0
      });

      const record = res.data.record;

      setInsertStatus(`✅ RECORD SAVED IN SUPABASE (ID: ${res.data.attendanceId || record?.id})`);
      setWebSocketStatus('⚡ Live Dashboard Updated via WebSockets');

      const now = record?.attendance_time ? new Date(record.attendance_time) : new Date();

      setSuccessData({
        studentName: record?.student_name || user?.name || 'Student',
        subject: record?.subject || 'Lecture Session',
        period: record?.period_number ? `Period ${record.period_number}` : (record?.period ? `Period ${record.period}` : 'Period 1'),
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        date: now.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
        attendanceCode: aCode,
        distanceMeters: res.data.distanceMeters || record?.distance_meters || 0,
        status: 'PRESENT',
        attendanceId: res.data.attendanceId || record?.id
      });

      confetti({ particleCount: 100, spread: 80, origin: { y: 0.55 } });

      let timer = 3;
      const interval = setInterval(() => {
        timer -= 1;
        setCountdown(timer);
        if (timer <= 0) {
          clearInterval(interval);
          onSuccessReturn();
        }
      }, 1000);
    } catch (err: any) {
      isProcessingRef.current = false;
      const msg = err.response?.data?.message || err.message || 'Unable to mark attendance. Please try scanning again.';
      setScanErrorMessage(msg);
      setInsertStatus(`❌ FAILED: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mobile Success View Component
  if (successData) {
    return (
      <div className="w-full max-w-sm sm:max-w-md mx-auto p-5 sm:p-7 rounded-[24px] bg-white border border-[#12B76A]/40 text-center space-y-5 shadow-enterprise animate-fade-in my-3 overflow-hidden">
        {/* Success Icon */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#ECFDF5] border border-[#12B76A]/30 text-[#12B76A] flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12" />
        </div>

        {/* Header */}
        <div className="space-y-1">
          <span className="inline-block px-3 py-1 rounded-full bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/30 text-xs font-extrabold uppercase tracking-wider">
            Verified & Recorded
          </span>
          <h2 className="font-display font-black text-xl sm:text-2xl text-[#111827] mt-2 leading-tight">
            ✅ Attendance Marked Successfully
          </h2>
          <p className="text-xs text-[#6B7280] font-medium pt-0.5">
            GPS Geofence + Dynamic 7s QR Verified.
          </p>
        </div>

        {/* Student & Lecture Details Card */}
        <div className="bg-[#FAFAFA] rounded-2xl p-4 border border-[#E7E7E7] space-y-3 text-center">
          <div>
            <span className="text-[10px] font-extrabold text-[#6D5DFC] uppercase tracking-wider block">Student Name</span>
            <p className="font-display font-extrabold text-lg text-[#111827]">{successData.studentName}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E7E7E7] text-xs">
            <div className="text-left bg-white p-2.5 rounded-xl border border-[#E7E7E7]">
              <span className="text-[10px] font-bold text-gray-500 uppercase block">Time</span>
              <p className="font-mono font-bold text-xs text-[#111827]">{successData.time}</p>
            </div>
            <div className="text-left bg-white p-2.5 rounded-xl border border-[#E7E7E7]">
              <span className="text-[10px] font-bold text-gray-500 uppercase block">Date</span>
              <p className="font-mono font-bold text-xs text-[#111827]">{successData.date}</p>
            </div>
          </div>
        </div>

        {/* Return Button / Countdown */}
        <div className="pt-1">
          <button
            onClick={onSuccessReturn}
            className="w-full py-3.5 px-5 rounded-2xl bg-[#12B76A] hover:bg-[#0E9F5B] text-white text-sm font-extrabold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
          >
            <span>Return to Dashboard</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full font-mono text-xs">({countdown}s)</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto text-center animate-fade-in">
      {/* Dev Telemetry Panel */}
      {showDevPanel && (
        <div className="bg-white p-4 rounded-[24px] border border-[#6D5DFC]/30 text-xs text-left space-y-2 font-mono shadow-enterprise">
          <div className="flex items-center justify-between pb-2 border-b border-[#E7E7E7] font-bold text-[#6D5DFC]">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-4 h-4" /> Camera Scanner Telemetry
            </span>
            <span className="text-[10px] text-[#12B76A]">Active</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7]">
              <span className="text-[#6B7280]">Camera Status:</span>
              <span className="font-bold text-[#111827] block">{cameraInitialized ? 'Init OK' : 'No'}</span>
            </div>
            <div className="p-2 rounded-xl bg-[#FAFAFA] border border-[#E7E7E7]">
              <span className="text-[#6B7280]">QR Scanned:</span>
              <span className={`font-bold block ${qrScanned ? 'text-[#12B76A]' : 'text-amber-500'}`}>
                {qrScanned ? 'YES' : 'Waiting...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Futuristic White Theme Scanner Container */}
      <div className="bg-white p-6 sm:p-8 rounded-[24px] border border-[#E7E7E7] shadow-enterprise space-y-6 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <button
            onClick={onSuccessReturn}
            className="px-3 py-1.5 rounded-full bg-white border border-[#E7E7E7] text-[#111827] hover:bg-[#FAFAFA] text-xs flex items-center gap-1.5 font-bold shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <span className="px-3.5 py-1 rounded-full bg-[#ECFDF5] text-[#12B76A] border border-[#12B76A]/20 text-xs font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
            Scanner Active
          </span>
        </div>

        {/* 24px Camera Viewfinder Frame */}
        <div className="relative w-full aspect-square max-w-[340px] mx-auto rounded-[24px] overflow-hidden bg-slate-950 border-4 border-[#6D5DFC]/40 shadow-2xl flex items-center justify-center">
          <div id="reader-stream-canvas" className="w-full h-full object-cover flex items-center justify-center" />

          {/* Target Scanner Reticle Overlay with Corner Markers & Laser Line */}
          <div className="absolute inset-0 border-2 border-dashed border-white/30 rounded-[20px] pointer-events-none flex items-center justify-center p-5">
            <div className="w-full h-full border-2 border-[#12B76A] rounded-2xl shadow-2xl relative overflow-hidden">
              {/* Corner Markers */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#12B76A] rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#12B76A] rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#12B76A] rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#12B76A] rounded-br-lg" />

              {/* Animated Laser Scanning Line */}
              <div className="w-full h-1 bg-gradient-to-r from-transparent via-[#12B76A] to-transparent shadow-lg shadow-[#12B76A]/50 animate-scanner-laser absolute top-0" />
            </div>
          </div>

          {isSubmitting && (
            <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center text-[#111827] space-y-3 z-20">
              <div className="w-12 h-12 rounded-2xl bg-[#ECFDF5] border border-[#12B76A]/40 text-[#12B76A] flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <p className="text-sm font-extrabold text-[#12B76A]">✅ QR Scanned!</p>
              <p className="text-xs text-[#6B7280] font-semibold">Recording Attendance Record...</p>
            </div>
          )}
        </div>

        {/* Student Camera Zoom Controls */}
        <div className="bg-[#FAFAFA] border border-[#E7E7E7] rounded-2xl p-3.5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-bold text-[#111827] px-1">
            <span className="flex items-center gap-1.5 text-[#6D5DFC]">
              <ZoomIn className="w-4 h-4 text-[#6D5DFC]" />
              Camera Zoom Controls
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D5DFC] font-mono text-xs font-extrabold border border-[#6D5DFC]/20">
              {zoomLevel.toFixed(1)}x
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Zoom Out Button */}
            <button
              type="button"
              onClick={() => applyZoom(zoomLevel - 0.5)}
              disabled={zoomLevel <= minZoom}
              className="p-2.5 rounded-xl bg-white border border-[#E7E7E7] text-[#111827] hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95 transition-all"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4 text-[#111827]" />
            </button>

            {/* Zoom Slider Control */}
            <div className="flex-1 flex items-center px-1">
              <input
                type="range"
                min={minZoom}
                max={maxZoom}
                step="0.1"
                value={zoomLevel}
                onChange={(e) => applyZoom(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#6D5DFC]"
              />
            </div>

            {/* Zoom In Button */}
            <button
              type="button"
              onClick={() => applyZoom(zoomLevel + 0.5)}
              disabled={zoomLevel >= maxZoom}
              className="p-2.5 rounded-xl bg-white border border-[#E7E7E7] text-[#111827] hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm active:scale-95 transition-all"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4 text-[#111827]" />
            </button>
          </div>
        </div>

        {/* Location & GPS Status Cards */}
        <div className="grid grid-cols-2 gap-3 text-left">
          {/* GPS Location Status Card */}
          <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827]">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>GPS Geofence</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 truncate">
              {gpsStatus}
            </p>
            <p className="text-[10px] text-slate-500 font-mono">Radius: 500m Max</p>
          </div>

          {/* Security Verification Card */}
          <div className="p-3.5 rounded-2xl bg-[#FAFAFA] border border-[#E7E7E7] space-y-1.5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#111827]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#6D5DFC]" />
                <span>Verification Mode</span>
              </div>
              <p className="text-[11px] text-[#6D5DFC] font-semibold mt-1">GPS + 7s Dynamic QR</p>
              <p className="text-[10px] text-slate-500 font-mono">Real-Time Supabase Sync</p>
            </div>
          </div>
        </div>

        {scanErrorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex flex-col items-center gap-2 animate-shake">
            <div className="flex items-center gap-2 font-bold text-rose-800 text-sm whitespace-pre-line">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{scanErrorMessage}</span>
            </div>
            <button
              onClick={() => {
                setScanErrorMessage(null);
                setQrScanned(false);
                isProcessingRef.current = false;
              }}
              className="mt-1 px-4 py-1.5 rounded-full bg-rose-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-sm hover:bg-rose-700"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Scan Again
            </button>
          </div>
        )}

        {cameraError && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{cameraError}</span>
            </div>
            <button
              onClick={startCamera}
              className="px-3.5 py-1.5 rounded-full bg-[#6D5DFC] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <RefreshCw className="w-3 h-3" /> Retry Camera
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
