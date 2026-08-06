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
  Check,
  Zap,
  Brain,
  Activity,
  Database,
  Layers
} from 'lucide-react';

// Floating particles configuration for ambient background bokeh
const particles = Array.from({ length: 18 }).map((_, i) => ({
  id: i,
  size: Math.floor(Math.random() * 12) + 4,
  initialX: Math.random() * 100,
  initialY: Math.random() * 100,
  duration: Math.random() * 12 + 10,
  delay: Math.random() * 5
}));

export const Login: React.FC = () => {
  const { login, loginAdmin, loginStudent, loginFaculty } = useAuth();
  const [role, setRole] = useState<'super_admin' | 'class_portal' | 'student'>('super_admin');

  const [identifier, setIdentifier] = useState('Vel');
  const [password, setPassword] = useState('Kandrix AI');
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
      setPassword('Kandrix AI');
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
    { label: '7s Dynamic QR', icon: QrCode },
    { label: 'Live GPS Attendance', icon: Radio },
    { label: 'Real Time Analytics', icon: BarChart3 },
    { label: 'AI Attendance Insights', icon: Brain },
    { label: 'Supabase Cloud', icon: Cloud }
  ];

  const stats = [
    { label: 'Students Registered', value: '1000+' },
    { label: 'Academic Departments', value: '12+' },
    { label: 'Attendance Accuracy', value: '99.9%' },
    { label: 'Real Time Engine', value: '24×7' }
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#070A19] font-sans select-none text-white flex flex-col lg:flex-row items-center justify-between">
      {/* ================================================== */}
      {/* 1. FULL SCREEN BACKGROUND WITH MULTI-LAYER OVERLAYS */}
      {/* ================================================== */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Full Viewport Campus Image (family.png) */}
        <img
          src="/family.png"
          alt="Vel Tech High Tech Campus Family"
          className="w-full h-full object-cover object-center opacity-85 scale-100 transform transition-transform duration-1000"
        />

        {/* Layer 1: Left to Right Dark Blue Gradient Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, rgba(7,10,25,0.88) 0%, rgba(10,18,45,0.78) 45%, rgba(17,31,70,0.45) 75%, rgba(7,10,25,0.30) 100%)'
          }}
        />

        {/* Layer 2: Radial Blue Glow from Left */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 15% 50%, rgba(37,99,235,0.40) 0%, transparent 60%)'
          }}
        />

        {/* Layer 3: Dark Vignette Around Edges */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle, transparent 40%, rgba(7,10,25,0.85) 100%)'
          }}
        />

        {/* Layer 4: Light Animated Glass Reflection Beam */}
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 bottom-0 w-1/3 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-12"
        />

        {/* Layer 5 & 6: Floating Blue Bokeh & Particles */}
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ x: `${p.initialX}vw`, y: `${p.initialY}vh`, opacity: 0.2 }}
            animate={{
              y: [`${p.initialY}vh`, `${(p.initialY - 30 + 100) % 100}vh`],
              x: [`${p.initialX}vw`, `${(p.initialX + 15) % 100}vw`],
              opacity: [0.2, 0.7, 0.2]
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: 'easeInOut'
            }}
            className="absolute rounded-full bg-sky-400/30 blur-[2px]"
            style={{ width: `${p.size}px`, height: `${p.size}px` }}
          />
        ))}

        {/* Glowing Aurora Spheres */}
        <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-1/4 w-[450px] h-[450px] rounded-full bg-purple-600/20 blur-[130px] pointer-events-none" />
      </div>

      {/* ================================================== */}
      {/* 2. SPLIT SCREEN LAYOUT (LEFT 60%, RIGHT 40%) */}
      {/* ================================================== */}

      {/* LEFT HERO SECTION (60% Width) */}
      <div className="relative w-full lg:w-[60%] min-h-[500px] lg:min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-14 z-10 overflow-y-auto scrollbar-none">
        
        {/* TOP: GLASS LOGO CARD */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap items-center justify-between gap-4"
        >
          <div className="p-2.5 pr-5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] p-0.5 shadow-lg shadow-blue-500/30">
              <div className="w-full h-full rounded-[10px] bg-[#0B1220] flex items-center justify-center text-[#38BDF8]">
                <Shield className="w-6 h-6 text-[#38BDF8]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight text-white font-display">
                  KANDRIX <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] to-[#7C3AED]">AI</span>
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-sky-300 px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/30 backdrop-blur-md">
                  Attendance System
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium">Vel Tech High Tech Engineering College</p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-sky-200 backdrop-blur-md shadow-lg">
            <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
            <span>AI POWERED SMART ATTENDANCE PLATFORM</span>
          </div>
        </motion.div>

        {/* MIDDLE: MAIN HERO CONTENT & FEATURE PILLS */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="my-auto py-8 space-y-6 max-w-2xl"
        >
          {/* FEATURE PILLS ROW */}
          <div className="flex flex-wrap gap-2 pt-2">
            {featurePills.map((pill, idx) => {
              const Icon = pill.icon;
              return (
                <motion.div
                  key={pill.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 + idx * 0.08 }}
                  whileHover={{ y: -3, scale: 1.05 }}
                  className="px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-bold text-sky-100 flex items-center gap-2 shadow-lg hover:border-sky-400/50 hover:bg-white/15 transition-all cursor-default"
                >
                  <Icon className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>{pill.label}</span>
                </motion.div>
              );
            })}
          </div>

          {/* MAIN HEADING */}
          <div className="space-y-2">
            <h1 className="font-extrabold text-4xl sm:text-6xl lg:text-7xl tracking-tight leading-[1.08] text-white">
              KANDRIX <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] via-white to-[#7C3AED]">AI</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2563EB] via-[#38BDF8] to-[#9333EA]">
                Attendance System
              </span>
            </h1>
            <p className="text-base sm:text-xl font-bold text-sky-200 tracking-wide pt-1">
              AI Powered Smart Attendance Platform
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-300">
              Designed exclusively for <span className="text-white font-extrabold underline decoration-sky-400/50">Vel Tech High Tech Engineering College</span>
            </p>
          </div>

          {/* DESCRIPTION */}
          <p className="text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-xl">
            Enterprise AI Attendance Platform combining GPS Presence Verification, Dynamic 7s QR Tokens, Real-time Analytics, Supabase Cloud Synchronization, Secure Role Authentication, and AI Attendance Reports.
          </p>

          {/* STATISTICS ROW */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
            {stats.map((st, idx) => (
              <motion.div
                key={st.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 + idx * 0.1 }}
                whileHover={{ y: -3 }}
                className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-xl text-center hover:border-sky-400/40 transition-all"
              >
                <div className="font-extrabold text-xl sm:text-2xl text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] to-white font-display">
                  {st.value}
                </div>
                <div className="text-[10px] text-slate-300 font-semibold mt-0.5">
                  {st.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* BOTTOM LEFT: SYSTEM ONLINE STATUS */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="flex items-center gap-3 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-xl text-xs font-bold max-w-max"
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </span>
          <span className="text-emerald-300 font-mono tracking-wide">ONLINE</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-200 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-sky-400" /> Supabase Connected
          </span>
        </motion.div>
      </div>

      {/* RIGHT SIDE: FLOATING GLASS LOGIN CARD (40% Width) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="w-full lg:w-[40%] max-w-md my-auto p-4 sm:p-6 lg:p-10 relative z-20"
      >
        {/* Outer Glow Halo behind Card */}
        <div className="absolute -inset-4 rounded-[42px] bg-gradient-to-r from-blue-600/30 via-sky-500/25 to-purple-600/30 blur-3xl opacity-80 pointer-events-none" />

        {/* FLOATING GLASS LOGIN CARD */}
        <div
          className="relative text-white space-y-6 p-7 sm:p-9 overflow-hidden transition-all duration-300 hover:shadow-[0_50px_120px_rgba(0,0,0,0.8)]"
          style={{
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            borderRadius: '36px',
            border: '1px solid rgba(255, 255, 255, 0.20)',
            boxShadow: '0 40px 100px rgba(0, 0, 0, 0.6)'
          }}
        >
          {/* HEADER */}
          <div className="space-y-2 text-center sm:text-left">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#38BDF8] shadow-lg">
                <Shield className="w-6 h-6 text-[#38BDF8]" />
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-sky-500/20 text-sky-300 border border-sky-400/30 backdrop-blur-md">
                KANDRIX AI v10
              </span>
            </div>
            <div>
              <h2 className="font-extrabold text-2xl sm:text-3xl text-white tracking-tight font-display">
                Welcome to KANDRIX AI
              </h2>
              <p className="text-xs text-slate-300 font-medium pt-1">
                Choose your portal to continue securely.
              </p>
            </div>
          </div>

          {/* PORTAL TABS (MODERN SEGMENTED CONTROL) */}
          <div className="relative p-1.5 rounded-2xl bg-white/10 border border-white/15 grid grid-cols-3 text-xs font-bold gap-1">
            <button
              type="button"
              onClick={() => handleRoleSelect('super_admin')}
              className={`relative py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 z-10 cursor-pointer ${
                role === 'super_admin'
                  ? 'text-white font-extrabold shadow-lg shadow-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
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
                  ? 'text-white font-extrabold shadow-lg shadow-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
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
                  ? 'text-white font-extrabold shadow-lg shadow-blue-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
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
                className="p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-200 text-xs flex items-center gap-2.5 font-medium shadow-md backdrop-blur-md"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FORM INPUTS */}
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-1.5">
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
                  className="w-full px-4 py-3.5 rounded-[22px] bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:border-[#38BDF8] focus:ring-4 focus:ring-sky-500/20 text-xs pl-11 font-medium transition-all shadow-inner backdrop-blur-md"
                />
                {role === 'super_admin' ? (
                  <Shield className="w-4 h-4 text-slate-400 group-focus-within:text-[#38BDF8] absolute left-4 top-4 transition-colors" />
                ) : role === 'class_portal' ? (
                  <GraduationCap className="w-4 h-4 text-slate-400 group-focus-within:text-[#38BDF8] absolute left-4 top-4 transition-colors" />
                ) : (
                  <User className="w-4 h-4 text-slate-400 group-focus-within:text-[#38BDF8] absolute left-4 top-4 transition-colors" />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider">
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
                  className="w-full px-4 py-3.5 rounded-[22px] bg-white/10 border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:border-[#38BDF8] focus:ring-4 focus:ring-sky-500/20 text-xs pl-11 pr-11 font-medium transition-all shadow-inner backdrop-blur-md"
                />
                <Lock className="w-4 h-4 text-slate-400 group-focus-within:text-[#38BDF8] absolute left-4 top-4 transition-colors" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* REMEMBER ME & FORGOT PASSWORD */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-600 focus:ring-sky-500"
                />
                <span>Remember Me</span>
              </label>

              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-[#38BDF8] hover:text-sky-300 font-bold hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* LOGIN BUTTON (60PX HEIGHT, ROUNDED 20PX, BLUE GRADIENT WITH GLOW) */}
            <motion.button
              whileHover={{ y: -2, scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              disabled={isLoading}
              className="w-full h-[60px] rounded-[20px] bg-gradient-to-r from-[#2563EB] to-[#3B82F6] hover:from-[#1D4ED8] hover:to-[#2563EB] font-extrabold text-sm text-white shadow-[0_12px_35px_rgba(37,99,235,0.45)] hover:shadow-[0_18px_45px_rgba(37,99,235,0.6)] transition-all flex items-center justify-center gap-2.5 mt-4 cursor-pointer disabled:opacity-50"
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

          {/* BOTTOM GLASS FOOTER */}
          <div className="pt-4 border-t border-white/15 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-300 flex-wrap gap-1">
              <span className="flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> AES-256 Encryption
              </span>
              <span className="flex items-center gap-1 text-sky-400">
                <Cloud className="w-3.5 h-3.5 text-sky-400" /> Supabase Cloud
              </span>
              <span className="flex items-center gap-1 text-purple-400">
                <Brain className="w-3.5 h-3.5 text-purple-400" /> AI Protected
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <Radio className="w-3.5 h-3.5 text-amber-400" /> GPS Enabled
              </span>
            </div>
            <p className="text-[10px] text-center text-slate-400 font-mono pt-1">
              KANDRIX AI Attendance Platform • Version v10 Enterprise
            </p>
          </div>
        </div>
      </motion.div>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#0F172A] w-full max-w-sm rounded-[32px] p-7 border border-white/20 shadow-2xl space-y-4 relative text-white"
            >
              <button
                onClick={() => setShowForgotModal(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-sky-400 flex items-center justify-center border border-blue-500/30">
                <HelpCircle className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-xl text-white">Reset Portal Password</h3>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                To reset your portal password or login credentials, please contact your Super Administrator or Class Portal Advisor.
              </p>
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-[11px] text-slate-300 space-y-1.5 font-mono">
                <p><strong className="text-sky-400">Super Admin:</strong> Vel (Password: Kandrix AI)</p>
                <p><strong className="text-sky-400">Class Portal:</strong> AI3A / AI3C (Password: 1234)</p>
                <p><strong className="text-sky-400">Student:</strong> 21104001 (Password: 1234)</p>
              </div>
              <button
                onClick={() => setShowForgotModal(false)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#2563EB] to-[#3B82F6] font-extrabold text-xs text-white hover:opacity-95 transition-all cursor-pointer shadow-lg"
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



