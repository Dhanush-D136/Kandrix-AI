import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Radio,
  BarChart3,
  Cloud,
  Eye,
  EyeOff,
  CheckCircle2,
  LockKeyhole,
  Building2,
  Cpu
} from 'lucide-react';

export const Login: React.FC = () => {
  const { login, loginAdmin, loginStudent, loginFaculty } = useAuth();
  const [role, setRole] = useState<'super_admin' | 'class_portal' | 'student'>('super_admin');

  const [identifier, setIdentifier] = useState('Vel');
  const [password, setPassword] = useState('Elite Minds');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

  const handleRoleSelect = (selectedRole: 'super_admin' | 'class_portal' | 'student') => {
    setRole(selectedRole);
    setError('');
    if (selectedRole === 'super_admin') {
      setIdentifier('Vel');
      setPassword('Elite Minds');
    } else if (selectedRole === 'class_portal') {
      setIdentifier('AI3A');
      setPassword('1234');
    } else {
      setIdentifier('21104001');
      setPassword('1234');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim() || !password.trim()) {
      setError('Please enter both your Username and Password.');
      return;
    }

    setIsLoading(true);
    try {
      if (login) {
        await login(identifier.trim(), password, role);
      } else if (role === 'super_admin') {
        await loginAdmin(identifier.trim(), password);
      } else if (role === 'class_portal') {
        await loginFaculty(identifier.trim(), password);
      } else {
        await loginStudent(identifier.trim(), password);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid Credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const featurePills = [
    { title: 'Live GPS Radar', icon: Radio, text: '500m Boundary' },
    { title: '7s Dynamic QR', icon: QrCode, text: 'AES-256 HMAC' },
    { title: 'AI Analytics', icon: BarChart3, text: 'Real-time Metrics' },
    { title: 'Cloud Sync', icon: Cloud, text: 'Supabase Container' }
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#070D19] font-sans select-none text-white flex flex-col lg:flex-row items-center justify-between">
      {/* 1. PAGE BACKGROUND AMBIENT GLOW MESH */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,rgba(37,99,235,0.18),transparent_60%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,rgba(124,58,237,0.15),transparent_60%)]" />
      </div>

      {/* 2. SPLIT SCREEN LAYOUT */}

      {/* LEFT SIDE (65%): FULL UNREGISTERED / UNBLURRED HERO IMAGE WITH LIGHT OVERLAY */}
      <div className="relative w-full lg:w-[65%] min-h-[400px] lg:min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 z-10 overflow-hidden">
        {/* BACKGROUND IMAGE CONTAINER WITH OBJECT-CONTAIN & NO BLUR */}
        <div className="absolute inset-0 z-0 flex items-center justify-center p-2 sm:p-4">
          <img
            src="/family.png"
            alt="Vel Tech High Tech Campus"
            className="w-full h-full object-contain object-center transition-transform duration-700 hover:scale-[1.01]"
          />
          {/* Ultra-Light 25-30% Gradient Overlay to preserve 100% image clarity */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, rgba(7, 13, 25, 0.35) 0%, rgba(7, 13, 25, 0.20) 50%, rgba(7, 13, 25, 0.30) 100%)`
            }}
          />
        </div>

        {/* TOP BRAND BAR */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 p-0.5 shadow-xl shadow-blue-500/30">
              <div className="w-full h-full rounded-[14px] bg-[#070D19]/80 backdrop-blur-md flex items-center justify-center text-white">
                <Shield className="w-6 h-6 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tight text-white font-display drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                  KANDRIX <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-400">AI</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-300 px-2.5 py-0.5 rounded-full bg-blue-600/30 border border-sky-400/40 backdrop-blur-md">
                  Attendance System
                </span>
              </div>
              <p className="text-xs text-slate-200 font-semibold drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
                Enterprise Campus Operating Platform
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/20 text-xs font-bold text-sky-300 shadow-lg">
            <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>VEL TECH HIGH TECH ENGINEERING COLLEGE</span>
          </div>
        </motion.div>

        {/* CENTER HERO TEXT OVERLAY (LEGIBLE WITH SUBTLE TEXT SHADOW) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="relative z-10 my-auto py-8 space-y-4 max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/70 border border-white/20 backdrop-blur-md text-xs font-semibold text-sky-300 shadow-xl">
            <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Vel Tech High Tech Engineering College Campus Engine</span>
          </div>

          <h1 className="font-extrabold text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.12] drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
            AI Powered <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-300 to-indigo-300">
              Smart Attendance Platform
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-100 font-medium leading-relaxed max-w-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            Secure enterprise ecosystem featuring Live GPS Attendance, 7s Dynamic QR Verification, Real-Time Student Monitoring, AI Risk Analytics, and Isolated Supabase Cloud Portals.
          </p>

          {/* Micro Feature Pills */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {featurePills.map((pill) => {
              const Icon = pill.icon;
              return (
                <div
                  key={pill.title}
                  className="px-3.5 py-2 rounded-2xl bg-slate-900/75 border border-white/20 backdrop-blur-md text-xs font-semibold text-white flex items-center gap-2 shadow-xl hover:border-sky-400/50 transition-colors"
                >
                  <Icon className="w-4 h-4 text-sky-400 shrink-0" />
                  <div>
                    <span className="block font-bold text-white leading-none">{pill.title}</span>
                    <span className="text-[10px] text-slate-300 font-mono leading-none">{pill.text}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* BOTTOM CREDENTIAL HINT BADGE */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10 p-3.5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-white/20 text-xs text-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-2xl max-w-xl"
        >
          <div className="flex items-center gap-2 text-sky-400 font-bold">
            <Cpu className="w-4 h-4" />
            <span>Isolated Multi-Tenant Containers Active</span>
          </div>
          <div className="text-[11px] text-slate-300 font-medium">
            Test Credentials Pre-Filled On Tab Select
          </div>
        </motion.div>
      </div>

      {/* RIGHT SIDE (35%): FLOATING GLASS LOGIN PANEL */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full lg:w-[35%] max-w-md my-auto p-4 sm:p-6 lg:p-8 relative z-20"
      >
        {/* Soft Ambient Blue Outer Glow */}
        <div className="absolute -inset-2 rounded-[36px] bg-gradient-to-r from-blue-500/30 via-sky-400/30 to-purple-600/30 blur-2xl opacity-80 pointer-events-none" />

        {/* MAIN FLOATING GLASS LOGIN CARD */}
        <div className="relative bg-white/92 backdrop-blur-2xl border border-white/60 shadow-[0_25px_60px_-15px_rgba(37,99,235,0.35)] rounded-[30px] p-7 sm:p-9 text-slate-800 space-y-6 overflow-hidden">
          {/* Card Header */}
          <div className="space-y-1.5 text-center sm:text-left">
            <div className="flex items-center justify-between">
              <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight font-display">
                Portal Sign In
              </h2>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Choose your portal and continue securely.
            </p>
          </div>

          {/* 3-WAY PORTAL TABS WITH SLIDING INDICATOR */}
          <div className="relative p-1.5 rounded-2xl bg-slate-100/90 border border-slate-200/90 grid grid-cols-3 text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => handleRoleSelect('super_admin')}
              className={`relative py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 z-10 cursor-pointer ${
                role === 'super_admin'
                  ? 'text-white font-extrabold shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
            >
              {role === 'super_admin' && (
                <motion.div
                  layoutId="portalTabActive"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] shadow-md z-[-1]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Shield className="w-3.5 h-3.5" />
              <span>Super Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('class_portal')}
              className={`relative py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 z-10 cursor-pointer ${
                role === 'class_portal'
                  ? 'text-white font-extrabold shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
            >
              {role === 'class_portal' && (
                <motion.div
                  layoutId="portalTabActive"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] shadow-md z-[-1]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Class Portal</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('student')}
              className={`relative py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 z-10 cursor-pointer ${
                role === 'student'
                  ? 'text-white font-extrabold shadow-md shadow-blue-500/25'
                  : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
            >
              {role === 'student' && (
                <motion.div
                  layoutId="portalTabActive"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] shadow-md z-[-1]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <User className="w-3.5 h-3.5" />
              <span>Student</span>
            </button>
          </div>

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5 font-medium shadow-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FORM INPUTS */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                {role === 'super_admin' ? 'Username' : role === 'class_portal' ? 'Portal ID / Username' : 'Register Number / Email'}
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
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-50/90 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/15 text-xs pl-11 font-medium transition-all shadow-inner"
                />
                {role === 'super_admin' ? (
                  <Shield className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 absolute left-4 top-4 transition-colors" />
                ) : role === 'class_portal' ? (
                  <GraduationCap className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 absolute left-4 top-4 transition-colors" />
                ) : (
                  <User className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 absolute left-4 top-4 transition-colors" />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative group">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3.5 rounded-2xl bg-slate-50/90 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-500/15 text-xs pl-11 pr-11 font-medium transition-all shadow-inner"
                />
                <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-blue-600 absolute left-4 top-4 transition-colors" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* REMEMBER ME & FORGOT PASSWORD */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-600 hover:text-slate-900">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Remember Me</span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* LARGE BLUE GRADIENT SUBMIT BUTTON */}
            <motion.button
              whileHover={{ scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] font-extrabold text-xs text-white shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating Portal...</span>
                </span>
              ) : (
                <>
                  <span>Sign In to Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* BOTTOM ENTERPRISE SECURITY FOOTER */}
          <div className="pt-4 border-t border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1 text-slate-600">
                <LockKeyhole className="w-3 h-3 text-blue-600" /> AES-256 Encryption
              </span>
              <span className="flex items-center gap-1 text-slate-600">
                <Cloud className="w-3 h-3 text-indigo-600" /> Supabase Cloud
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> AI Protected
              </span>
            </div>
            <p className="text-[10px] text-center text-slate-400 font-mono">
              KANDRIX AI Attendance Platform • Enterprise Edition v9.0
            </p>
          </div>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white w-full max-w-sm rounded-[28px] p-7 border border-slate-200 shadow-2xl space-y-4 relative text-slate-800"
            >
              <button
                onClick={() => setShowForgotModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-xl text-slate-900">Reset Credentials</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                To reset your portal password or login credentials, please contact your Super Administrator or Class Portal Advisor.
              </p>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1 font-mono">
                <p><strong>Super Admin:</strong> Vel (Password: Elite Minds)</p>
                <p><strong>Class Portal:</strong> AI3A / AI3C (Password: 1234)</p>
                <p><strong>Student:</strong> 21104001 (Password: 1234)</p>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="w-full py-3.5 rounded-2xl bg-slate-900 font-extrabold text-xs text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                Got It, Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Login;


