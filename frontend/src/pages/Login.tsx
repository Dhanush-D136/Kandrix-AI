import React, { useState } from 'react';
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
  Cpu,
  Check
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

  const featureCards = [
    { title: 'Live GPS Radar', icon: Radio, text: '500m Classroom Boundary', color: 'text-blue-600 bg-blue-50 border-blue-100' },
    { title: 'Dynamic 7s QR', icon: QrCode, text: 'AES-256 Cryptographic Token', color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    { title: 'AI Analytics', icon: BarChart3, text: 'Real-time Attendance Metrics', color: 'text-sky-600 bg-sky-50 border-sky-100' },
    { title: 'Supabase Cloud', icon: Cloud, text: 'Isolated Multi-Tenant Containers', color: 'text-teal-600 bg-teal-50 border-teal-100' }
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#F8FAFC] via-[#EEF5FF] to-[#FDFDFD] font-sans select-none text-slate-900 flex flex-col lg:flex-row items-center justify-between">
      {/* 1. SOFT AMBIENT LIGHT RADIAL GLOW */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-10 w-[600px] h-[600px] rounded-full bg-sky-200/40 blur-[130px]" />
        <div className="absolute -bottom-20 -left-20 w-[500px] h-[500px] rounded-full bg-blue-200/30 blur-[140px]" />
      </div>

      {/* 2. SPLIT SCREEN LAYOUT */}

      {/* LEFT SIDE (65%): BRIGHT CLEAR CAMPUS HERO SECTION */}
      <div className="relative w-full lg:w-[65%] min-h-[420px] lg:min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-12 z-10 overflow-hidden">
        {/* BACKGROUND IMAGE CONTAINER WITH LIGHT SOFT OVERLAY (NO BLUR, NO DARK) */}
        <div className="absolute inset-0 z-0 flex items-center justify-center p-2 sm:p-4">
          <img
            src="/family.png"
            alt="Vel Tech High Tech Campus"
            className="w-full h-full object-contain object-center transition-transform duration-700 hover:scale-[1.01]"
          />
          {/* Soft light gradient overlay: rgba(255,255,255,0.15) to rgba(10,90,255,0.10) */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(10,90,255,0.10) 100%)`
            }}
          />
        </div>

        {/* TOP BRAND HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 flex items-center justify-between"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2563EB] to-[#38BDF8] p-0.5 shadow-lg shadow-blue-500/20">
              <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center text-blue-600">
                <Shield className="w-6 h-6 text-[#2563EB]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-2xl tracking-tight text-slate-900 font-display">
                  KANDRIX <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1E40AF] to-[#38BDF8]">AI</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-blue-700 px-2.5 py-0.5 rounded-full bg-blue-100/90 border border-blue-200 backdrop-blur-md">
                  Attendance System
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">Enterprise Campus Operating Platform</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-slate-200 text-xs font-bold text-blue-900 shadow-sm backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>VEL TECH HIGH TECH ENGINEERING COLLEGE</span>
          </div>
        </motion.div>

        {/* HERO TEXT SECTION */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="relative z-10 my-auto py-8 space-y-4 max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-blue-200 backdrop-blur-md text-xs font-bold text-blue-800 shadow-md">
            <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Vel Tech High Tech Engineering College Campus Engine</span>
          </div>

          <div className="space-y-1">
            <h1 className="font-extrabold text-4xl sm:text-5xl lg:text-6xl text-slate-900 tracking-tight leading-[1.12]">
              Welcome Back to <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1E40AF] via-[#2563EB] to-[#38BDF8]">
                KANDRIX AI
              </span>
            </h1>
            <p className="text-base sm:text-lg font-extrabold text-blue-900/90 tracking-wide pt-1">
              Enterprise Smart Attendance Platform
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Secure AI-powered attendance with:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-semibold text-slate-800">
              <div className="flex items-center gap-2 bg-white/85 p-2 rounded-xl border border-white/90 shadow-sm">
                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Live GPS Attendance</span>
              </div>
              <div className="flex items-center gap-2 bg-white/85 p-2 rounded-xl border border-white/90 shadow-sm">
                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Dynamic QR Verification</span>
              </div>
              <div className="flex items-center gap-2 bg-white/85 p-2 rounded-xl border border-white/90 shadow-sm">
                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Real-time Analytics</span>
              </div>
              <div className="flex items-center gap-2 bg-white/85 p-2 rounded-xl border border-white/90 shadow-sm">
                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Supabase Cloud Sync</span>
              </div>
            </div>
          </div>

          {/* Modern Glass Feature Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="p-3.5 rounded-2xl bg-white/90 backdrop-blur-md border border-white/90 shadow-md text-slate-800 flex items-start gap-3 hover:shadow-lg transition-all"
                >
                  <div className={`w-9 h-9 rounded-xl border ${card.color} flex items-center justify-center shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs text-slate-900">{card.title}</h3>
                    <p className="text-[11px] text-slate-500 font-medium">{card.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* BOTTOM CONTAINER BADGE */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative z-10 p-3.5 rounded-2xl bg-white/90 backdrop-blur-md border border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-3 shadow-md max-w-xl"
        >
          <div className="flex items-center gap-2 text-blue-700 font-bold">
            <Cpu className="w-4 h-4" />
            <span>Isolated Multi-Tenant Containers Active</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Test Credentials Pre-Filled On Tab Select
          </div>
        </motion.div>
      </div>

      {/* RIGHT SIDE (35%): FLOATING WHITE GLASS LOGIN CARD */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full lg:w-[35%] max-w-md my-auto p-4 sm:p-6 lg:p-8 relative z-20"
      >
        {/* Soft Blue Outer Glow behind Login Card */}
        <div className="absolute -inset-4 rounded-[40px] bg-gradient-to-r from-blue-300/30 via-sky-200/40 to-blue-200/30 blur-3xl opacity-70 pointer-events-none" />

        {/* PURE WHITE FLOATING GLASS LOGIN CARD */}
        <div
          className="relative text-slate-800 space-y-6 p-7 sm:p-9 overflow-hidden transition-all duration-300 hover:shadow-[0_45px_90px_rgba(20,40,120,0.18)]"
          style={{
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            borderRadius: '32px',
            border: '1px solid rgba(255, 255, 255, 0.65)',
            boxShadow: '0 40px 80px rgba(20, 40, 120, 0.15)'
          }}
        >
          {/* CARD TOP HEADER WITH BLUE SHIELD ICON */}
          <div className="space-y-3 text-center sm:text-left">
            <div className="flex items-center justify-between">
              <div className="w-13 h-13 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2563EB] shadow-sm">
                <Shield className="w-7 h-7 text-[#2563EB]" />
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div>
              <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 tracking-tight font-display">
                Welcome Back
              </h2>
              <p className="text-xs text-slate-500 font-medium pt-0.5">
                Sign in to continue to <span className="font-bold text-blue-700">KANDRIX AI</span>
              </p>
            </div>
          </div>

          {/* 3-WAY PORTAL TABS (WHITE PILLS / BLUE GRADIENT ACTIVE) */}
          <div className="relative p-1.5 rounded-2xl bg-slate-100/80 border border-slate-200/80 grid grid-cols-3 text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => handleRoleSelect('super_admin')}
              className={`relative py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 z-10 cursor-pointer ${
                role === 'super_admin'
                  ? 'text-white font-extrabold shadow-md shadow-blue-500/25'
                  : 'bg-white text-slate-600 hover:bg-sky-50 hover:text-blue-600 font-semibold'
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
                  : 'bg-white text-slate-600 hover:bg-sky-50 hover:text-blue-600 font-semibold'
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
                  : 'bg-white text-slate-600 hover:bg-sky-50 hover:text-blue-600 font-semibold'
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
                  className="w-full px-4 py-3.5 rounded-[16px] bg-white border border-[#E5E7EB] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/15 text-xs pl-11 font-medium transition-all shadow-sm"
                />
                {role === 'super_admin' ? (
                  <Shield className="w-4 h-4 text-slate-400 group-focus-within:text-[#2563EB] absolute left-4 top-4 transition-colors" />
                ) : role === 'class_portal' ? (
                  <GraduationCap className="w-4 h-4 text-slate-400 group-focus-within:text-[#2563EB] absolute left-4 top-4 transition-colors" />
                ) : (
                  <User className="w-4 h-4 text-slate-400 group-focus-within:text-[#2563EB] absolute left-4 top-4 transition-colors" />
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
                  className="w-full px-4 py-3.5 rounded-[16px] bg-white border border-[#E5E7EB] text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2563EB] focus:ring-4 focus:ring-blue-500/15 text-xs pl-11 pr-11 font-medium transition-all shadow-sm"
                />
                <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-[#2563EB] absolute left-4 top-4 transition-colors" />
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
                className="text-xs text-[#2563EB] hover:text-blue-800 font-bold hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* LARGE PREMIUM BUTTON WITH GLOW & LIFT */}
            <motion.button
              whileHover={{ y: -2, scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-[16px] bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] font-extrabold text-xs text-white shadow-[0_10px_30px_rgba(59,130,246,0.25)] hover:shadow-[0_15px_35px_rgba(59,130,246,0.4)] transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50"
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
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Secure Login
              </span>
              <span className="flex items-center gap-1 text-blue-600">
                <Cloud className="w-3.5 h-3.5 text-blue-600" /> Supabase Cloud
              </span>
              <span className="flex items-center gap-1 text-indigo-600">
                <LockKeyhole className="w-3.5 h-3.5 text-indigo-600" /> AI Protected
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
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
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


