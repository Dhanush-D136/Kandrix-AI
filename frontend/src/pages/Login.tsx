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

  // Mouse Parallax Effect for Background Elements
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const x = (clientX / window.innerWidth - 0.5) * 20;
      const y = (clientY / window.innerHeight - 0.5) * 20;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

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
    {
      title: 'Live GPS Attendance',
      desc: '1-Tap instant verification within 500m classroom boundary',
      icon: Radio,
      badge: 'Real-time Radar',
      color: 'from-blue-500/20 to-cyan-500/20',
      iconColor: 'text-cyan-400'
    },
    {
      title: 'Dynamic QR Verification',
      desc: '7-second auto-rotating cryptographic QR token pool',
      icon: QrCode,
      badge: 'AES-256 HMAC',
      color: 'from-purple-500/20 to-pink-500/20',
      iconColor: 'text-purple-400'
    },
    {
      title: 'AI Analytics & Risk Engine',
      desc: 'Instant attendance percentage, risk detection & period metrics',
      icon: BarChart3,
      badge: 'Smart Insights',
      color: 'from-indigo-500/20 to-blue-500/20',
      iconColor: 'text-indigo-400'
    },
    {
      title: 'Supabase Cloud Sync',
      desc: 'Isolated Class Portal containers with real-time RLS cloud storage',
      icon: Cloud,
      badge: 'Isolated Portals',
      color: 'from-emerald-500/20 to-teal-500/20',
      iconColor: 'text-emerald-400'
    }
  ];

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0B1220] font-sans select-none text-white flex flex-col justify-between">
      {/* 1. FULL SCREEN BACKGROUND WITH VEL TECH ENTRANCE & OVERLAYS */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        {/* Background Image: family.png */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-1000 scale-105"
          style={{
            backgroundImage: `url('/family.png')`,
            transform: `translate3d(${mousePos.x * -0.5}px, ${mousePos.y * -0.5}px, 0) scale(1.03)`
          }}
        />

        {/* Custom Dark Blue-Black Gradient Overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(115deg, rgba(8, 15, 32, 0.88) 0%, rgba(18, 28, 52, 0.78) 45%, rgba(20, 42, 90, 0.55) 100%)`
          }}
        />

        {/* Screen Edge Vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at center, transparent 35%, rgba(5, 9, 20, 0.85) 100%)`
          }}
        />

        {/* Backdrop Blur Effect */}
        <div className="absolute inset-0 backdrop-blur-[5px]" />

        {/* Animated Ambient Gradient Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.35, 0.55, 0.35],
            x: [0, 30, 0],
            y: [0, -30, 0]
          }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-32 -left-32 w-[550px] h-[550px] rounded-full bg-blue-600/30 blur-[130px]"
        />

        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.25, 0.45, 0.25],
            x: [0, -40, 0],
            y: [0, 40, 0]
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -bottom-32 left-1/3 w-[600px] h-[600px] rounded-full bg-indigo-600/25 blur-[140px]"
        />

        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 right-10 w-[450px] h-[450px] rounded-full bg-sky-500/20 blur-[120px]"
        />

        {/* Slow Floating Light Particles */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1200),
              y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 800),
              opacity: Math.random() * 0.5 + 0.2
            }}
            animate={{
              y: [0, -120, 0],
              x: [0, Math.sin(i) * 40, 0],
              opacity: [0.2, 0.7, 0.2]
            }}
            transition={{
              duration: 10 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="absolute w-1.5 h-1.5 rounded-full bg-sky-300/60 shadow-[0_0_10px_rgba(96,165,250,0.8)]"
          />
        ))}
      </div>

      {/* 2. SPLIT SCREEN CONTENT WRAPPER */}
      <div className="relative z-10 min-h-screen w-full max-w-[1600px] mx-auto flex flex-col lg:flex-row items-center justify-between p-6 sm:p-10 lg:p-14 gap-10">
        
        {/* LEFT SIDE (60% HERO SECTION) */}
        <div className="w-full lg:w-[58%] flex flex-col justify-between space-y-8 my-auto">
          {/* Header Brand Bar */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-4"
          >
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-500 to-indigo-600 p-0.5 shadow-2xl shadow-blue-500/40">
              <div className="w-full h-full rounded-[14px] bg-[#0B1220]/90 backdrop-blur-md flex items-center justify-center text-white">
                <Shield className="w-7 h-7 text-sky-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-2xl tracking-tight text-white font-display">
                  KANDRIX <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">AI</span>
                </span>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-sky-300 px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/30 backdrop-blur-md">
                  Attendance System
                </span>
              </div>
              <p className="text-xs text-slate-300/80 font-medium">Enterprise Campus Operating Platform</p>
            </div>
          </motion.div>

          {/* Main Hero Headings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="space-y-4"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/20 backdrop-blur-xl text-xs font-semibold text-sky-300 shadow-lg">
              <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
              <span>AI Powered Smart Attendance Platform</span>
            </div>

            <h1 className="font-extrabold text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-[1.12]">
              Next-Gen Campus <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-blue-400 to-purple-400">
                Attendance Intelligence
              </span>
            </h1>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Building2 className="w-4 h-4 text-sky-400 shrink-0" />
              <span>Designed for <strong>Vel Tech High Tech Engineering College</strong></span>
            </div>

            <p className="text-sm sm:text-base text-slate-300/90 leading-relaxed font-normal max-w-xl">
              Secure enterprise attendance ecosystem featuring Live GPS Attendance, Dynamic 7s QR Verification, AI Analytics, Real-Time Student Monitoring, and Supabase Cloud Sync.
            </p>
          </motion.div>

          {/* 2x2 Glass Feature Cards */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  whileHover={{ y: -6, scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="group relative p-4 sm:p-5 rounded-3xl bg-white/[0.08] backdrop-blur-xl border border-white/20 hover:border-sky-400/50 shadow-xl hover:shadow-2xl hover:shadow-sky-500/20 transition-all duration-300 overflow-hidden"
                >
                  {/* Subtle Gradient Glow background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                  <div className="relative z-10 flex items-start justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className={`w-5 h-5 ${card.iconColor}`} />
                    </div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 px-2 py-0.5 rounded-full bg-white/10 border border-white/15">
                      {card.badge}
                    </span>
                  </div>

                  <div className="relative z-10 mt-3.5 space-y-1">
                    <h3 className="font-extrabold text-sm text-white group-hover:text-sky-300 transition-colors">{card.title}</h3>
                    <p className="text-xs text-slate-300/80 leading-relaxed">{card.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Quick Credential Hint Banner */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="p-4 rounded-2xl bg-white/[0.06] backdrop-blur-xl border border-white/15 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-3 shadow-lg"
          >
            <div className="flex items-center gap-2 text-sky-400 font-bold">
              <Cpu className="w-4 h-4" />
              <span>Multi-Tenant Class Portals Isolated</span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              Default Test Credentials Pre-Filled Upon Selection
            </div>
          </motion.div>
        </div>

        {/* RIGHT SIDE (40% FLOATING GLASS LOGIN CARD) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
          transition={{
            opacity: { duration: 0.6 },
            scale: { duration: 0.6 },
            y: { duration: 6, repeat: Infinity, ease: 'easeInOut' }
          }}
          className="w-full lg:w-[40%] max-w-md my-auto relative"
        >
          {/* Glass Card Outer Glow */}
          <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-blue-500/40 via-sky-400/40 to-purple-600/40 blur-xl opacity-70 group-hover:opacity-100 transition-opacity" />

          {/* MAIN FLOATING GLASS CARD CONTAINER */}
          <div className="relative bg-white/90 backdrop-blur-[35px] border border-white/50 shadow-2xl rounded-[30px] p-7 sm:p-9 text-slate-800 space-y-6 overflow-hidden">
            {/* Top Decorative Glass Highlight */}
            <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-blue-400/20 blur-2xl pointer-events-none" />

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
                className={`relative py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 z-10 ${
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
                className={`relative py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 z-10 ${
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
                className={`relative py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 z-10 ${
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
      </div>

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

