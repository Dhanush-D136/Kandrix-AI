import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, LogOut, Smartphone } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, deviceFingerprint } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-6 lg:px-10 py-3 flex items-center justify-between shadow-sm">
      {/* Brand Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-sans font-extrabold text-base tracking-tight text-slate-900">
              KANDRIX <span className="text-blue-600">AI</span>
            </span>
            <span className="text-[10px] font-bold text-blue-700 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200/80 tracking-wider">
              ATTENDANCE
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium hidden sm:block">AI Enhanced Smart QR Attendance Platform</p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Device Fingerprint Status */}
        {user?.role === 'student' && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700" title={`Registered Device ID: ${deviceFingerprint}`}>
            <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-slate-500">Device:</span>
            <span className="text-emerald-600 font-semibold">{deviceFingerprint ? deviceFingerprint.substring(0, 10) + '...' : 'Verified'}</span>
          </div>
        )}

        {/* User Profile */}
        {user && (
          <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
            <img
              src={user.profile_photo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={user.name}
              className="w-8 h-8 rounded-full border border-slate-200 object-cover shadow-sm"
            />
            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-800">{user.name}</p>
              <p className="text-[10px] text-blue-600 uppercase tracking-wider font-semibold">
                {user.role} {user.roll_number ? `(${user.roll_number})` : ''}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-1"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

