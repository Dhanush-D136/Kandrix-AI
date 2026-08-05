import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  User,
  GraduationCap,
  Lock,
  ArrowRight,
  AlertCircle,
  HelpCircle,
  X,
  Sparkles,
  QrCode,
  Calendar,
  LockKeyhole,
  CheckCircle2
} from 'lucide-react';

export const Login: React.FC = () => {
  const { loginAdmin, loginStudent, loginFaculty } = useAuth();
  const [role, setRole] = useState<'super_admin' | 'class_portal' | 'student'>('super_admin');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password.trim()) {
      setError('Please enter both your Username and Password.');
      return;
    }

    setIsLoading(true);
    try {
      if (role === 'super_admin') {
        await loginAdmin(identifier.trim(), password);
      } else if (role === 'class_portal') {
        await loginFaculty(identifier.trim(), password);
      } else {
        await loginStudent(identifier.trim(), password);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col lg:flex-row relative overflow-hidden font-sans select-none">
      {/* Ambient Aurora Animated Background Orbs */}
      <div className="bg-aurora-glow" />

      {/* LEFT SIDE: BRAND EXPERIENCE & HERO BANNER */}
      <div className="lg:w-[55%] w-full relative min-h-[300px] sm:min-h-[380px] lg:min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-14 z-10">
        {/* TOP BRANDING BAR */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 border border-white/40">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-xl tracking-tight block">
                KANDRIX <span className="text-blue-600">AI</span>
              </span>
              <span className="text-blue-600 text-[10px] font-bold uppercase tracking-widest block">
                Attendance System
              </span>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-slate-200 text-slate-700 text-xs font-bold shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>AI ENHANCED PLATFORM</span>
          </div>
        </div>

        {/* CENTER HERO BRANDING */}
        <div className="my-auto py-8 lg:py-12 space-y-6 max-w-xl">
          {/* Floating Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
              <QrCode className="w-3.5 h-3.5 text-blue-600" />
              <span>7s Rotating Dynamic QR</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-full bg-purple-50 border border-purple-200/80 text-purple-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
              <GraduationCap className="w-3.5 h-3.5 text-purple-600" />
              <span>Dedicated Class Portals</span>
            </div>
            <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/80 text-emerald-700 text-xs font-semibold flex items-center gap-1.5 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Live Attendance Sync</span>
            </div>
          </div>

          {/* Title & Description */}
          <div className="space-y-3">
            <h1 className="font-extrabold text-4xl sm:text-5xl lg:text-6xl text-slate-900 tracking-tight leading-tight">
              KANDRIX AI <br />
              <span className="bg-gradient-to-r from-blue-600 via-sky-500 to-indigo-600 bg-clip-text text-transparent">
                Attendance System
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed max-w-lg">
              AI Enhanced Smart QR Attendance Platform. Fast, secure, zero-friction attendance tracking designed for modern academic institutions.
            </p>
          </div>

          {/* DEFAULT CREDENTIALS HELP BOX */}
          <div className="p-4 rounded-2xl bg-white/80 backdrop-blur-xl border border-slate-200 shadow-sm space-y-2">
            <p className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Default Credentials:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="font-bold text-blue-700 block">Super Admin</span>
                <span className="text-slate-600 text-[11px] block">Username: <strong>Vel</strong></span>
                <span className="text-slate-600 text-[11px] block">Password: <strong>Elite Minds</strong></span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="font-bold text-purple-700 block">Class Portal</span>
                <span className="text-slate-600 text-[11px] block">Username: <strong>Portal ID (AI3A)</strong></span>
                <span className="text-slate-600 text-[11px] block">Password: <strong>1234</strong></span>
              </div>
              <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                <span className="font-bold text-emerald-700 block">Student</span>
                <span className="text-slate-600 text-[11px] block">Username: <strong>Register No.</strong></span>
                <span className="text-slate-600 text-[11px] block">Password: <strong>1234</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: AUTHENTICATION CARD */}
      <div className="lg:w-[45%] w-full flex flex-col justify-center p-4 sm:p-8 lg:p-12 z-20 relative my-auto">
        <div className="w-full max-w-md mx-auto kandrix-card p-6 sm:p-9 space-y-6">
          
          {/* Header Title */}
          <div className="space-y-1 text-center sm:text-left">
            <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight">
              Portal Sign In
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Select your portal and enter credentials.
            </p>
          </div>

          {/* 3-WAY ROLE SWITCHER */}
          <div className="p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200 grid grid-cols-3 text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => { setRole('super_admin'); setError(''); setIdentifier('Vel'); setPassword('Elite Minds'); }}
              className={`py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                role === 'super_admin'
                  ? 'bg-white text-blue-600 shadow-sm font-bold border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Super Admin</span>
            </button>

            <button
              type="button"
              onClick={() => { setRole('class_portal'); setError(''); setIdentifier(''); setPassword(''); }}
              className={`py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                role === 'class_portal'
                  ? 'bg-white text-purple-600 shadow-sm font-bold border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Class Portal</span>
            </button>

            <button
              type="button"
              onClick={() => { setRole('student'); setError(''); setIdentifier(''); setPassword(''); }}
              className={`py-2.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 ${
                role === 'student'
                  ? 'bg-white text-emerald-600 shadow-sm font-bold border border-slate-200/80'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Student</span>
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {role === 'super_admin' ? 'Username' : role === 'class_portal' ? 'Portal ID / Class Name' : 'Register Number'}
              </label>
              <div className="relative group">
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={
                    role === 'super_admin'
                      ? 'Vel'
                      : role === 'class_portal'
                      ? 'e.g. AI3A'
                      : 'e.g. 21104001'
                  }
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-xs pl-11 font-medium transition-all"
                />
                {role === 'super_admin' ? (
                  <Shield className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 absolute left-4 top-4 transition-colors" />
                ) : role === 'class_portal' ? (
                  <GraduationCap className="w-4 h-4 text-slate-400 group-focus-within:text-purple-600 absolute left-4 top-4 transition-colors" />
                ) : (
                  <User className="w-4 h-4 text-slate-400 group-focus-within:text-emerald-600 absolute left-4 top-4 transition-colors" />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-blue-600 hover:underline font-bold"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative group">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 text-xs pl-11 font-medium transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 absolute left-4 top-4 transition-colors" />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 font-extrabold text-xs text-white shadow-md shadow-blue-500/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer"
            >
              {isLoading ? (
                <span>Authenticating Portal...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* FOOTER BADGES */}
          <div className="pt-4 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
            <span className="flex items-center gap-1">
              <LockKeyhole className="w-3 h-3 text-blue-600" /> Dynamic Encryption
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> KANDRIX AI Engine v3.0
            </span>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[28px] p-7 border border-slate-200 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-xl text-slate-900">Reset Password</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              To reset your portal credentials, please contact the Super Admin or your Class Advisor. Initial passwords can be changed upon login.
            </p>
            <button
              onClick={() => setShowForgotModal(false)}
              className="w-full py-3.5 rounded-2xl bg-slate-900 font-bold text-xs text-white hover:bg-slate-800 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

